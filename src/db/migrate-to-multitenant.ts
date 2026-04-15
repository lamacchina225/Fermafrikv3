/**
 * Script de migration vers le multi-tenant.
 *
 * Ce script :
 * 1. Crée une ferme par défaut pour les données existantes
 * 2. Associe tous les utilisateurs à cette ferme
 * 3. Ajoute farm_id à toutes les lignes existantes
 *
 * Usage : npm run db:migrate-tenant
 */
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { eq, isNull } from "drizzle-orm";

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("DATABASE_URL non défini");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log("=== Migration multi-tenant ===\n");

  try {
    console.log("1. Création de la ferme par défaut...");
    const existingFarm = await db.query.farms.findFirst();

    let farmId: number;
    if (existingFarm) {
      farmId = existingFarm.id;
      console.log(`   Ferme existante trouvée (id=${farmId})`);
    } else {
      const [farm] = await db
        .insert(schema.farms)
        .values({ name: "Ma ferme" })
        .returning();
      farmId = farm.id;
      console.log(`   Ferme créée (id=${farmId})`);
    }

    console.log("2. Association des utilisateurs...");
    await db
      .update(schema.users)
      .set({ farmId })
      .where(isNull(schema.users.farmId));

    const adminUser = await db.query.users.findFirst({
      where: eq(schema.users.role, "admin"),
    });
    if (adminUser) {
      await db
        .update(schema.farms)
        .set({ ownerId: adminUser.id })
        .where(eq(schema.farms.id, farmId));
      console.log(`   Owner défini: ${adminUser.username} (id=${adminUser.id})`);
    }

    const tables = [
      { name: "buildings", table: "buildings" },
      { name: "cycles", table: "cycles" },
      { name: "daily_records", table: "daily_records" },
      { name: "expenses", table: "expenses" },
      { name: "sales", table: "sales" },
      { name: "health_records", table: "health_records" },
      { name: "feed_stock", table: "feed_stock" },
      { name: "clients", table: "clients" },
    ] as const;

    for (const { name, table } of tables) {
      console.log(`3. Migration de ${name}...`);
      await pool.query(`UPDATE ${table} SET farm_id = $1 WHERE farm_id IS NULL`, [farmId]);
    }

    console.log("4. Migration des settings...");
    const oldSettings = await pool.query(
      "SELECT key, value, updated_by, updated_at FROM settings WHERE farm_id IS NULL OR farm_id = 0"
    );

    for (const setting of oldSettings.rows) {
      await db
        .insert(schema.settings)
        .values({
          farmId,
          key: setting.key as string,
          value: setting.value as string,
          updatedBy: setting.updated_by as number | null,
        })
        .onConflictDoUpdate({
          target: [schema.settings.farmId, schema.settings.key],
          set: { value: setting.value as string },
        });
    }

    console.log("\n=== Migration terminée ! ===");
    console.log(`Toutes les données ont été associées à la ferme id=${farmId}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Erreur de migration:", err);
  process.exit(1);
});
