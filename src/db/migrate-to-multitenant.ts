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
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { eq, isNull, sql } from "drizzle-orm";

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("DATABASE_URL non défini");
    process.exit(1);
  }

  const sqlClient = neon(DATABASE_URL);
  const db = drizzle(sqlClient, { schema });

  console.log("=== Migration multi-tenant ===\n");

  // 1. Créer la ferme par défaut
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

  // 2. Associer les utilisateurs à la ferme
  console.log("2. Association des utilisateurs...");
  await db
    .update(schema.users)
    .set({ farmId })
    .where(isNull(schema.users.farmId));

  // Mettre à jour le owner
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

  // 3. Migrer toutes les tables métier
  const tables = [
    { name: "buildings", table: "buildings" },
    { name: "cycles", table: "cycles" },
    { name: "daily_records", table: "daily_records" },
    { name: "expenses", table: "expenses" },
    { name: "sales", table: "sales" },
    { name: "health_records", table: "health_records" },
    { name: "feed_stock", table: "feed_stock" },
    { name: "clients", table: "clients" },
  ];

  for (const { name, table } of tables) {
    console.log(`3. Migration de ${name}...`);
    await sqlClient(`UPDATE ${table} SET farm_id = ${farmId} WHERE farm_id IS NULL`);
  }

  // 4. Migrer les settings (ancien format clé primaire → nouveau format avec farm_id)
  console.log("4. Migration des settings...");
  const oldSettings = await sqlClient(`SELECT key, value, updated_by, updated_at FROM settings WHERE farm_id IS NULL OR farm_id = 0`);
  for (const s of oldSettings) {
    await db
      .insert(schema.settings)
      .values({
        farmId,
        key: s.key as string,
        value: s.value as string,
        updatedBy: s.updated_by as number | null,
      })
      .onConflictDoUpdate({
        target: [schema.settings.farmId, schema.settings.key],
        set: { value: s.value as string },
      });
  }

  console.log("\n=== Migration terminée ! ===");
  console.log(`Toutes les données ont été associées à la ferme id=${farmId}`);
}

main().catch((err) => {
  console.error("Erreur de migration:", err);
  process.exit(1);
});
