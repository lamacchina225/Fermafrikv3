import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { eq, desc } from "drizzle-orm";

// Charger .env.local manuellement
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

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmt(date: Date): string {
  return date.toISOString().split("T")[0];
}

async function seedDemo() {
  console.log("Génération des données de démo...");

  // Récupérer le bâtiment et cycle actif
  const building = await db.query.buildings.findFirst({
    where: eq(schema.buildings.status, "active"),
  });
  if (!building) throw new Error("Aucun bâtiment actif");

  const cycle = await db.query.cycles.findFirst({
    where: eq(schema.cycles.buildingId, building.id),
    orderBy: [desc(schema.cycles.id)],
  });
  if (!cycle) throw new Error("Aucun cycle actif");

  // Vérifier si données déjà présentes
  const existing = await db.query.dailyRecords.findFirst({
    where: eq(schema.dailyRecords.cycleId, cycle.id),
  });
  if (existing) {
    console.log("Données de démo déjà présentes, skip.");
    return;
  }

  const productionStart = new Date("2025-11-17");
  const today = new Date("2026-03-29");

  let effectif = cycle.initialCount; // 600
  let currentDate = new Date(productionStart);
  let stockOeufsAccumules = 0;
  let lastVenteDate = new Date(productionStart);

  // Use typed arrays
  const drInsert: (typeof schema.dailyRecords.$inferInsert)[] = [];
  const salInsert: (typeof schema.sales.$inferInsert)[] = [];
  const expInsert: (typeof schema.expenses.$inferInsert)[] = [];

  // Dépenses mensuelles fixes
  const months = ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03"];
  for (const month of months) {
    // Alimentation mensuelle (achat de sacs)
    expInsert.push({
      cycleId: cycle.id,
      buildingId: building.id,
      expenseDate: `${month}-05`,
      label: "Achat aliment ponte (sacs 50kg)",
      amount: String(rnd(180000, 220000)),
      category: "alimentation" as const,
      createdBy: 1,
    });
    // Main d'œuvre
    expInsert.push({
      cycleId: cycle.id,
      buildingId: building.id,
      expenseDate: `${month}-28`,
      label: "Salaire ouvrier avicole",
      amount: "75000",
      category: "main_oeuvre" as const,
      createdBy: 1,
    });
    // Énergie
    expInsert.push({
      cycleId: cycle.id,
      buildingId: building.id,
      expenseDate: `${month}-10`,
      label: "Facture électricité + eau",
      amount: String(rnd(25000, 40000)),
      category: "energie" as const,
      createdBy: 1,
    });
  }
  // Dépenses santé ponctuelles
  expInsert.push({
    cycleId: cycle.id, buildingId: building.id,
    expenseDate: "2025-12-03", label: "Vaccin Newcastle (rappel)", amount: "18500",
    category: "sante" as const, createdBy: 1,
  });
  expInsert.push({
    cycleId: cycle.id, buildingId: building.id,
    expenseDate: "2026-01-15", label: "Traitement antibiotique préventif", amount: "12000",
    category: "sante" as const, createdBy: 1,
  });
  expInsert.push({
    cycleId: cycle.id, buildingId: building.id,
    expenseDate: "2026-02-08", label: "Désinfectant poulailler", amount: "8500",
    category: "sante" as const, createdBy: 1,
  });

  // Saisies journalières
  while (currentDate <= today) {
    const dateStr = fmt(currentDate);

    // Taux de ponte: 75-87%, légèrement décroissant avec le temps
    const jourProd = Math.floor((currentDate.getTime() - productionStart.getTime()) / 86400000);
    const basePonte = Math.max(65, 87 - jourProd * 0.04); // déclin progressif
    const tauxPonte = Math.min(90, basePonte + rnd(-4, 4)) / 100;

    const eggsCollected = Math.round(effectif * tauxPonte);
    const eggsBroken = rnd(2, 8);

    // Mortalité : 0 la plupart du temps, parfois 1-3
    let mortality = 0;
    if (Math.random() < 0.12) mortality = rnd(1, 2);
    if (Math.random() < 0.02) mortality = rnd(3, 5); // rare pic
    effectif = Math.max(effectif - mortality, 0);

    const feedKg = rnd(48, 56);
    const feedCost = feedKg * rnd(95, 110); // ~100 XOF/kg

    stockOeufsAccumules += eggsCollected - eggsBroken;

    drInsert.push({
      cycleId: cycle.id,
      buildingId: building.id,
      recordDate: dateStr,
      eggsCollected,
      eggsBroken,
      eggsSold: 0,
      mortalityCount: mortality,
      mortalityCause: mortality > 0 ? (Math.random() < 0.6 ? "maladie" : "inconnu") : null,
      feedQuantityKg: String(feedKg),
      feedType: "ponte" as const,
      feedCost: String(feedCost),
      revenue: "0",
      createdBy: 1,
    });

    // Ventes groupées toutes les 2-4 jours si stock suffisant
    const joursSinceVente = Math.floor((currentDate.getTime() - lastVenteDate.getTime()) / 86400000);
    if (joursSinceVente >= rnd(2, 4) && stockOeufsAccumules >= 90) {
      const plaquettes = Math.min(Math.floor(stockOeufsAccumules / 30), rnd(8, 20));
      if (plaquettes >= 3) {
        const unitPrice = 7000;
        salInsert.push({
          cycleId: cycle.id,
          buildingId: building.id,
          saleDate: dateStr,
          traysSold: plaquettes,
          unitPrice: String(unitPrice),
          totalAmount: String(plaquettes * unitPrice),
          buyerName: ["Marché Rood Woko", "Boutique Zogona", "Revendeur Gounghin", "Client particulier"][rnd(0,3)],
          createdBy: 1,
        });
        stockOeufsAccumules -= plaquettes * 30;
        lastVenteDate = new Date(currentDate);
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  // Insérer par batches
  console.log(`Insertion de ${drInsert.length} saisies journalières...`);
  const batchSize = 50;
  for (let i = 0; i < drInsert.length; i += batchSize) {
    await db.insert(schema.dailyRecords).values(drInsert.slice(i, i + batchSize));
  }

  console.log(`Insertion de ${salInsert.length} ventes...`);
  for (let i = 0; i < salInsert.length; i += batchSize) {
    await db.insert(schema.sales).values(salInsert.slice(i, i + batchSize));
  }

  console.log(`Insertion de ${expInsert.length} dépenses...`);
  await db.insert(schema.expenses).values(expInsert);

  console.log("Données de démo générées avec succès !");
  console.log(`  - ${drInsert.length} jours de saisie`);
  console.log(`  - ${salInsert.length} transactions de vente`);
  console.log(`  - ${expInsert.length} dépenses`);
}

seedDemo().catch(console.error).finally(() => process.exit(0));
