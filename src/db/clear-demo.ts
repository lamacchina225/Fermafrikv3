/**
 * Script pour supprimer les données de démo
 * Conserve : utilisateurs, bâtiments, cycles, paramètres, clients
 * Supprime  : saisies journalières, ventes, dépenses, santé, stock aliments
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
import { sql } from "drizzle-orm";
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

async function clearDemo() {
  console.log("Suppression des données de démo...");

  const drCount = (await db.select({ count: sql`count(*)` }).from(schema.dailyRecords))[0]?.count ?? 0;
await db.delete(schema.dailyRecords);
  const saCount = (await db.select({ count: sql`count(*)` }).from(schema.sales))[0]?.count ?? 0;
await db.delete(schema.sales);
  const exCount = (await db.select({ count: sql`count(*)` }).from(schema.expenses))[0]?.count ?? 0;
await db.delete(schema.expenses);
  const hrCount = (await db.select({ count: sql`count(*)` }).from(schema.healthRecords))[0]?.count ?? 0;
await db.delete(schema.healthRecords);
  const fsCount = (await db.select({ count: sql`count(*)` }).from(schema.feedStock))[0]?.count ?? 0;
await db.delete(schema.feedStock);

  console.log("Données supprimées :");
  console.log(`  - Saisies journalières : ${drCount}`);
  console.log(`  - Ventes              : ${saCount}`);
  console.log(`  - Dépenses            : ${exCount}`);
  console.log(`  - Santé               : ${hrCount}`);
  console.log(`  - Stock aliments      : ${fsCount}`);
  console.log("Base prête pour les vraies données !");
}

clearDemo().catch(console.error).finally(() => process.exit(0));

