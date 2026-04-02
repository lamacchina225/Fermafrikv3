/**
 * Nettoyage post-migration :
 * 1. Supprime le bâtiment de seed (id=3) et son cycle vide
 * 2. Nettoie les labels de dépenses (supprime le préfixe [IMPORT_CARNET_...])
 * 3. Renomme "Ferme principale" en "Bâtiment A"
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
import { eq, like } from "drizzle-orm";
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

const pool = mysql.createPool(process.env.DATABASE_URL!);
const db = drizzle(pool, { schema, mode: "default" });

async function fix() {
  console.log("🔧 Nettoyage post-migration...\n");

  // 1. Supprimer le cycle du seed (bâtiment 3)
  const seedCycles = await db.query.cycles.findMany({
    where: eq(schema.cycles.buildingId, 3),
  });
  if (seedCycles.length > 0) {
    await db.delete(schema.cycles).where(eq(schema.cycles.buildingId, 3));
    console.log(`  ✓ ${seedCycles.length} cycle(s) du seed supprimé(s)`);
  }

  // 2. Supprimer le bâtiment du seed (id=3)
  const seedBuilding = await db.query.buildings.findFirst({
    where: eq(schema.buildings.id, 3),
  });
  if (seedBuilding) {
    await db.delete(schema.buildings).where(eq(schema.buildings.id, 3));
    console.log(`  ✓ Bâtiment "${seedBuilding.name}" (seed) supprimé`);
  }

  // 3. Renommer "Ferme principale" → "Bâtiment A"
  await db
    .update(schema.buildings)
    .set({ name: "Bâtiment A" })
    .where(eq(schema.buildings.name, "Ferme principale"));
  console.log(`  ✓ Bâtiment renommé → "Bâtiment A"`);

  // 4. Nettoyer les labels de dépenses avec préfixe [IMPORT_CARNET_...]
  // Format: [IMPORT_CARNET_xxx] Label → on garde juste "Label"
  const allExpenses = await db.query.expenses.findMany({
    where: like(schema.expenses.label, "[IMPORT_%"),
  });

  let cleaned = 0;
  for (const expense of allExpenses) {
    const match = expense.label.match(/^\[IMPORT_[^\]]+\]\s*(.+)$/);
    if (match && match[1]) {
      await db
        .update(schema.expenses)
        .set({ label: match[1].trim() })
        .where(eq(schema.expenses.id, expense.id));
      cleaned++;
    }
  }
  console.log(`  ✓ ${cleaned} labels de dépenses nettoyés`);

  // 5. Vérification finale
  const buildings = await db.query.buildings.findMany();
  const cycles = await db.query.cycles.findMany();
  console.log("\n=== État final ===");
  buildings.forEach(b => console.log(`  Bâtiment [${b.id}] "${b.name}" — ${b.capacity} poules — ${b.status}`));
  cycles.forEach(c => console.log(`  Cycle [${c.id}] bâtiment ${c.buildingId} — ${c.startDate} — ${c.phase}`));
  console.log("\n✅ Nettoyage terminé !");
}

fix().catch(console.error).finally(() => process.exit(0));

