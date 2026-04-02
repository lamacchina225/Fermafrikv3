/**
 * Script export Neon PostgreSQL -> SQL MariaDB
 * Usage: npx tsx --env-file=.env.local src/db/export-to-mysql.ts
 * Prerequis: NEON_DATABASE_URL dans .env.local (ou DATABASE_URL si encore sur Neon)
 * Output: neon-export.sql
 */
import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split(String.fromCharCode(10));
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    const k = t.slice(0, idx).trim();
    const v = t.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

const SOURCE_URL = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
if (!SOURCE_URL) throw new Error("NEON_DATABASE_URL ou DATABASE_URL requis");

const sql = neon(SOURCE_URL);

function escVal(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return val ? "1" : "0";
  if (val instanceof Date) {
    return JSON.stringify(val.toISOString().replace("T", " ").slice(0, 19));
  }
  return JSON.stringify(String(val));
}

const BT = String.fromCharCode(96);

async function exportTable(tableName: string, orderCol = "id"): Promise<string> {
  type Row = Record<string, unknown>;
  const query = "SELECT * FROM " + tableName + " ORDER BY " + orderCol;
  const rows = (await sql(query as unknown as TemplateStringsArray)) as Row[];
  if (!rows || rows.length === 0) return "-- Table " + tableName + ": vide";

  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => BT + c + BT).join(", ");

  const inserts = rows.map((row: Row) => {
    const vals = cols.map((c) => escVal(row[c])).join(", ");
    return "INSERT INTO " + BT + tableName + BT + " (" + colList + ") VALUES (" + vals + ");";
  });

  return [
    "-- " + tableName + " (" + rows.length + " lignes)",
    "LOCK TABLES " + BT + tableName + BT + " WRITE;",
    ...inserts,
    "UNLOCK TABLES;",
    "",
  ].join(String.fromCharCode(10));
}

async function main() {
  console.log("Export Neon -> MariaDB SQL...");
  const parts: string[] = [];
  parts.push("-- Export FermAfrik: Neon PostgreSQL -> MariaDB IONOS");
  parts.push("-- Genere le: " + new Date().toISOString());
  parts.push("-- mysql -h HOST -u USER -p DATABASE < neon-export.sql");
  parts.push("");
  parts.push("SET FOREIGN_KEY_CHECKS=0;");
  parts.push("SET NAMES utf8mb4;");
  parts.push("");

  const tables: [string, string][] = [
    ["users", "id"], ["buildings", "id"], ["clients", "id"],
    ["cycles", "id"], ["daily_records", "id"], ["expenses", "id"],
    ["sales", "id"], ["health_records", "id"], ["feed_stock", "id"],
    ["settings", "key"],
  ];

  for (const [table, order] of tables) {
    process.stdout.write("  " + table + "... ");
    try {
      const block = await exportTable(table, order);
      const count = (block.match(/^INSERT/gm) ?? []).length;
      parts.push(block);
      console.log(count + " lignes");
    } catch (_e) {
      console.log("ignoree");
    }
  }

  parts.push("SET FOREIGN_KEY_CHECKS=1;");
  const out = path.resolve(process.cwd(), "neon-export.sql");
  fs.writeFileSync(out, parts.join(String.fromCharCode(10)), "utf-8");
  console.log("Fichier: " + out);
  console.log("Import: mysql -h HOST -u USER -p DATABASE < neon-export.sql");
}

main().catch(console.error).finally(() => process.exit(0));
