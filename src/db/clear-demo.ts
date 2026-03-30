/**
 * Script pour supprimer les données de démo
 * Conserve : utilisateurs, bâtiments, cycles, paramètres, clients
 * Supprime  : saisies journalières, ventes, dépenses, santé, stock aliments
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
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

async function clearDemo() {
  console.log("Suppression des données de démo...");

  const [dr] = await db.delete(schema.dailyRecords).returning({ id: schema.dailyRecords.id });
  const [sa] = await db.delete(schema.sales).returning({ id: schema.sales.id });
  const [ex] = await db.delete(schema.expenses).returning({ id: schema.expenses.id });
  const [hr] = await db.delete(schema.healthRecords).returning({ id: schema.healthRecords.id });
  const [fs2] = await db.delete(schema.feedStock).returning({ id: schema.feedStock.id });

  console.log("Données supprimées :");
  console.log(`  - Saisies journalières : ${Array.isArray(dr) ? dr.length : 0}`);
  console.log(`  - Ventes              : ${Array.isArray(sa) ? sa.length : 0}`);
  console.log(`  - Dépenses            : ${Array.isArray(ex) ? ex.length : 0}`);
  console.log(`  - Santé               : ${Array.isArray(hr) ? hr.length : 0}`);
  console.log(`  - Stock aliments      : ${Array.isArray(fs2) ? fs2.length : 0}`);
  console.log("Base prête pour les vraies données !");
}

clearDemo().catch(console.error).finally(() => process.exit(0));
