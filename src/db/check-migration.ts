import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
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

const pool = mysql.createPool(process.env.DATABASE_URL!);
const db = drizzle(pool, { schema, mode: "default" });

async function check() {
  const buildings = await db.query.buildings.findMany();
  const cycles = await db.query.cycles.findMany();
  const clients = await db.query.clients.findMany();
  const records = await db.query.dailyRecords.findMany({ limit: 3 });
  const sales = await db.query.sales.findMany({ limit: 3 });
  const expenses = await db.query.expenses.findMany({ limit: 3 });

  console.log("\n=== Bâtiments ===");
  buildings.forEach(b => console.log(`  [${b.id}] ${b.name} — ${b.capacity} poules — ${b.status}`));

  console.log("\n=== Cycles ===");
  cycles.forEach(c => console.log(`  [${c.id}] bâtiment ${c.buildingId} — démarré ${c.startDate} — phase: ${c.phase} — ${c.initialCount} poules`));

  console.log("\n=== Clients ===");
  clients.forEach(c => console.log(`  [${c.id}] ${c.name} — ${c.city ?? "?"} — ${c.phone ?? "?"}`));

  console.log("\n=== 3 premières saisies ===");
  records.forEach(r => console.log(`  ${r.recordDate} — œufs: ${r.eggsCollected} — mortalité: ${r.mortalityCount}`));

  console.log("\n=== 3 premières ventes ===");
  sales.forEach(s => console.log(`  ${s.saleDate} — ${s.traysSold} plq × ${s.unitPrice} XOF = ${s.totalAmount} XOF — client: ${s.buyerName ?? s.clientId}`));

  console.log("\n=== 3 premières dépenses ===");
  expenses.forEach(e => console.log(`  ${e.expenseDate} — ${e.label} — ${e.amount} XOF [${e.category}]`));
}

check().catch(console.error).finally(() => process.exit(0));

