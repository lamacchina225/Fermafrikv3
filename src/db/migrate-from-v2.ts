// @ts-nocheck
/**
 * Migration Ferm'Afrik v2 (Prisma) → v3 (Drizzle)
 *
 * Source : ancienne base Neon (Prisma, IDs cuid, table "Bande" etc.)
 * Cible  : nouvelle base Neon (Drizzle, IDs serial integer)
 *
 * Correspondances :
 *   Farm        → buildings
 *   Bande       → cycles
 *   DailyLog    → daily_records
 *   EggSale     → sales
 *   Expense     → expenses
 *   Client      → clients
 *   EggPrice    → settings (prix_plaquette)
 *
 * Notes unités :
 *   eggsProducedAlv   = alvéoles (plateaux 30 œufs) → × 30 = nb œufs
 *   eggsBrokenAlv     = alvéoles cassées           → × 30 = nb œufs cassés
 *   feedConsumedBags  = sacs 10 kg                 → × 10 = kg
 *   qtyAlv (EggSale)  = plateaux vendus            → = trays_sold
 */

import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNew } from "drizzle-orm/neon-http";
import postgres from "postgres";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

function loadEnv() {
  const p = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    const key = t.slice(0, idx).trim();
    const val = t.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

// ─── Connexions ─────────────────────────────────────────────────────────────

const OLD_DB_URL =
  "postgresql://neondb_owner:npg_Jmj80YEVKlTD@ep-autumn-heart-alq7i98q-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const NEW_DB_URL = process.env.DATABASE_URL!;

// Ancienne DB via postgres.js (plus flexible pour les requêtes raw)
const oldSql = postgres(OLD_DB_URL, { ssl: "require", max: 5 });

// Nouvelle DB via Drizzle
const newSql = neon(NEW_DB_URL);
const db = drizzleNew(newSql, { schema });

// ─── Mapping catégories dépenses ────────────────────────────────────────────
function mapCategory(
  cat: string
): "alimentation" | "sante" | "energie" | "main_oeuvre" | "equipement" | "autre" {
  switch (cat) {
    case "ALIMENT":    return "alimentation";
    case "SANTE":      return "sante";
    case "TRANSPORT":  return "autre";
    case "SALAIRE":    return "main_oeuvre";
    default:           return "autre";
  }
}

// ─── Helper batch insert ─────────────────────────────────────────────────────
async function batchInsert<T>(
  items: T[],
  fn: (batch: T[]) => Promise<void>,
  size = 50
) {
  for (let i = 0; i < items.length; i += size) {
    await fn(items.slice(i, i + size));
    process.stdout.write(`\r  ${Math.min(i + size, items.length)}/${items.length}`);
  }
  process.stdout.write("\n");
}

// ─── Migration principale ────────────────────────────────────────────────────
async function migrate() {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   Migration Ferm'Afrik v2 → v3               ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // ── 0. Vérifier que la nouvelle DB est vide (sécurité) ──────────────────
  const existingRecords = await db.query.dailyRecords.findFirst();
  if (existingRecords) {
    console.error("⚠️  Des données existent déjà dans la nouvelle base.");
    console.error("   Lance `npm run db:clear` avant de migrer.");
    process.exit(1);
  }

  // ── 1. Lire les données source ──────────────────────────────────────────
  console.log("📥 Lecture de l'ancienne base...");

  const [farms, bandes, dailyLogs, eggSales, expenses, oldClients, eggPrices] =
    await Promise.all([
      oldSql`SELECT * FROM "Farm"   ORDER BY "createdAt"`,
      oldSql`SELECT * FROM "Bande"  ORDER BY "createdAt"`,
      oldSql`SELECT * FROM "DailyLog" ORDER BY "date"`,
      oldSql`SELECT * FROM "EggSale" ORDER BY "saleDate"`,
      oldSql`SELECT * FROM "Expense" ORDER BY "expenseDate"`,
      oldSql`SELECT * FROM "Client"  ORDER BY "createdAt"`,
      oldSql`SELECT * FROM "EggPrice" ORDER BY "effectiveDate" DESC LIMIT 1`,
    ]);

  console.log(`  Fermes       : ${farms.length}`);
  console.log(`  Bandes       : ${bandes.length}`);
  console.log(`  DailyLogs    : ${dailyLogs.length}`);
  console.log(`  Ventes œufs  : ${eggSales.length}`);
  console.log(`  Dépenses     : ${expenses.length}`);
  console.log(`  Clients      : ${oldClients.length}`);
  console.log(`  Prix plaquette: ${eggPrices.length > 0 ? eggPrices[0].unitPriceXof : "non défini"}\n`);

  // ── 2. Bâtiments (Farm → buildings) ────────────────────────────────────
  console.log("🏗️  Migration des bâtiments...");
  // On prend la première ferme active, ou la première ferme tout court
  const activeFarm = farms.find((f: { isActive: boolean }) => f.isActive) ?? farms[0];
  if (!activeFarm) {
    console.error("❌ Aucune ferme trouvée dans l'ancienne base.");
    process.exit(1);
  }

  // Map cuid → new integer id
  const buildingIdMap: Record<string, number> = {};
  for (const farm of farms) {
    const inserted = await db
      .insert(schema.buildings)
      .values({
        name: farm.name,
        capacity: 600, // sera mis à jour depuis la bande
        status: farm.isActive ? "active" : "inactive",
      })
      .returning();
    buildingIdMap[farm.id] = inserted[0].id;
    console.log(`  ✓ ${farm.name} → id ${inserted[0].id}`);
  }

  // ── 3. Cycles (Bande → cycles) ─────────────────────────────────────────
  console.log("\n🔄 Migration des bandes → cycles...");
  const cycleIdMap: Record<string, number> = {};
  const bandeBuildingMap: Record<string, number> = {}; // bandeId → buildingId

  for (const bande of bandes) {
    const buildingId = buildingIdMap[bande.farmId];
    if (!buildingId) continue;

    // Mettre à jour la capacité du bâtiment avec chicksJ1
    await db
      .update(schema.buildings)
      .set({ capacity: bande.chicksJ1 })
      .where(eq(schema.buildings.id, buildingId));

    const startDate = new Date(bande.startDate).toISOString().split("T")[0];

    // Calculer la phase actuelle
    const startMs = new Date(bande.startDate).getTime();
    const nowMs = Date.now();
    const daysSinceStart = Math.floor((nowMs - startMs) / 86400000);
    let phase: "demarrage" | "croissance" | "production" = "demarrage";
    if (daysSinceStart > 180) phase = "production";
    else if (daysSinceStart > 60) phase = "croissance";

    const inserted = await db
      .insert(schema.cycles)
      .values({
        buildingId,
        startDate,
        phase,
        initialCount: bande.chicksJ1,
        notes: bande.name,
      })
      .returning();

    cycleIdMap[bande.id] = inserted[0].id;
    bandeBuildingMap[bande.id] = buildingId;
    console.log(`  ✓ Bande "${bande.name}" → cycle id ${inserted[0].id} (phase: ${phase})`);
  }

  // ── 4. Clients ────────────────────────────────────────────────────────
  console.log("\n👥 Migration des clients...");
  const clientNameMap: Record<string, number> = {}; // old client name → new integer id

  if (oldClients.length > 0) {
    await batchInsert(oldClients, async (batch) => {
      for (const c of batch) {
        const existing = await db.query.clients.findFirst({
          where: eq(schema.clients.name, c.name),
        });
        if (!existing) {
          const ins = await db
            .insert(schema.clients)
            .values({
              name: c.name,
              city: c.city ?? null,
              phone: c.phone ?? null,
            })
            .returning();
          clientNameMap[c.name] = ins[0].id;
        } else {
          clientNameMap[c.name] = existing.id;
        }
      }
    });
    console.log(`  ✓ ${oldClients.length} clients migrés`);
  }

  // ── 5. Saisies journalières (DailyLog → daily_records) ─────────────
  console.log("\n📋 Migration des saisies journalières...");
  const dailyLogIdMap: Record<string, number> = {}; // old id → new id

  const recordsToInsert = dailyLogs
    .filter((dl: { bandeId: string }) => cycleIdMap[dl.bandeId] !== undefined)
    .map((dl: {
      id: string; bandeId: string; date: string;
      mortality: number; eggsProducedAlv: number; eggsBrokenAlv: number;
      feedConsumedBags10kg: number;
    }) => {
      const cycleId = cycleIdMap[dl.bandeId];
      const buildingId = bandeBuildingMap[dl.bandeId];
      const recordDate = new Date(dl.date).toISOString().split("T")[0];

      // Conversions d'unités
      const eggsCollected = Math.round(Number(dl.eggsProducedAlv) * 30);
      const eggsBroken = Math.round(Number(dl.eggsBrokenAlv) * 30);
      const feedKg = (Number(dl.feedConsumedBags10kg) * 10).toFixed(2);

      return {
        _oldId: dl.id,
        cycleId,
        buildingId,
        recordDate,
        eggsCollected,
        eggsBroken,
        eggsSold: 0,
        mortalityCount: dl.mortality ?? 0,
        feedQuantityKg: feedKg,
        feedType: "ponte" as const,
        feedCost: "0",
        revenue: "0",
        createdBy: null as number | null,
      };
    });

  await batchInsert(recordsToInsert, async (batch) => {
    for (const rec of batch) {
      const { _oldId, ...values } = rec;
      const ins = await db.insert(schema.dailyRecords).values(values).returning();
      if (_oldId) dailyLogIdMap[_oldId] = ins[0].id;
    }
  });
  console.log(`  ✓ ${recordsToInsert.length} saisies migrées`);

  // ── 6. Ventes (EggSale → sales) ────────────────────────────────────
  console.log("\n🥚 Migration des ventes...");

  // Construire un map client par nom (depuis EggSale.client qui est un string)
  const salesToInsert = eggSales.filter(
    (s: { bandeId: string }) => cycleIdMap[s.bandeId] !== undefined
  );

  await batchInsert(salesToInsert, async (batch) => {
    for (const s of batch) {
      const cycleId = cycleIdMap[s.bandeId];
      const buildingId = bandeBuildingMap[s.bandeId];
      if (!cycleId || !buildingId) continue;

      const saleDate = new Date(s.saleDate).toISOString().split("T")[0];
      const traysSold = Math.round(Number(s.qtyAlv)); // alvéoles = plateaux
      const unitPrice = Number(s.unitPriceXof).toFixed(2);
      const totalAmount = Number(s.totalXof).toFixed(2);

      // Chercher le client par nom
      const clientId = clientNameMap[s.client] ?? null;

      await db.insert(schema.sales).values({
        cycleId,
        buildingId,
        saleDate,
        traysSold,
        unitPrice,
        totalAmount,
        clientId,
        buyerName: clientId ? null : (s.client ?? null),
        createdBy: null,
      });
    }
  });
  console.log(`  ✓ ${salesToInsert.length} ventes migrées`);

  // ── 7. Dépenses (Expense → expenses) ───────────────────────────────
  console.log("\n💰 Migration des dépenses...");

  const expensesToInsert = expenses.filter(
    (e: { bandeId: string }) => cycleIdMap[e.bandeId] !== undefined
  );

  await batchInsert(expensesToInsert, async (batch) => {
    for (const e of batch) {
      const cycleId = cycleIdMap[e.bandeId];
      const buildingId = bandeBuildingMap[e.bandeId];
      if (!cycleId || !buildingId) continue;

      const expenseDate = new Date(e.expenseDate).toISOString().split("T")[0];

      await db.insert(schema.expenses).values({
        cycleId,
        buildingId,
        expenseDate,
        label: e.description ?? mapCategory(e.category),
        amount: Number(e.amountXof).toFixed(2),
        category: mapCategory(e.category),
        createdBy: null,
      });
    }
  });
  console.log(`  ✓ ${expensesToInsert.length} dépenses migrées`);

  // ── 8. Prix plaquette (EggPrice → settings) ─────────────────────────
  if (eggPrices.length > 0) {
    const price = Number(eggPrices[0].unitPriceXof);
    console.log(`\n💲 Mise à jour du prix plaquette : ${price} XOF`);
    await db
      .insert(schema.settings)
      .values({ key: "prix_plaquette", value: String(price) })
      .onConflictDoUpdate({
        target: schema.settings.key,
        set: { value: String(price) },
      });
  }

  // ── 9. Résumé ────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   ✅ Migration terminée avec succès !         ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`\n  Bâtiments : ${Object.keys(buildingIdMap).length}`);
  console.log(`  Cycles    : ${Object.keys(cycleIdMap).length}`);
  console.log(`  Clients   : ${oldClients.length}`);
  console.log(`  Saisies   : ${recordsToInsert.length}`);
  console.log(`  Ventes    : ${salesToInsert.length}`);
  console.log(`  Dépenses  : ${expensesToInsert.length}\n`);

  await oldSql.end();
}

migrate().catch((e) => {
  console.error("\n❌ Erreur de migration :", e.message);
  process.exit(1);
}).finally(() => process.exit(0));

