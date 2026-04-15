import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as bcrypt from "bcryptjs";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL est requis dans les variables d'environnement");
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

async function seed() {
  console.log("Démarrage du seeding...");

  // 1. Créer la ferme par défaut
  console.log("Création de la ferme...");
  const [farm] = await db
    .insert(schema.farms)
    .values({ name: "Ferm'Afrik" })
    .returning();
  const farmId = farm.id;

  // 2. Créer les utilisateurs
  console.log("Création des utilisateurs...");
  const adminHash = await bcrypt.hash("290686", 10);
  const gestionHash = await bcrypt.hash("gestion", 10);
  const demoHash = await bcrypt.hash("demo", 10);

  const insertedUsers = await db
    .insert(schema.users)
    .values([
      { username: "admin", passwordHash: adminHash, role: "admin" as const, farmId },
      { username: "gestion", passwordHash: gestionHash, role: "gestionnaire" as const, farmId },
      { username: "demo", passwordHash: demoHash, role: "demo" as const, farmId },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`${insertedUsers.length} utilisateurs créés`);

  // Mettre à jour le owner de la ferme
  const adminUser = insertedUsers.find((u) => u.role === "admin");
  if (adminUser) {
    await db.update(schema.farms).set({ ownerId: adminUser.id }).where(eq(schema.farms.id, farmId));
  }

  // 3. Créer le bâtiment A
  console.log("Création du bâtiment A...");
  const insertedBuildings = await db
    .insert(schema.buildings)
    .values([{ farmId, name: "Bâtiment A", capacity: 600, status: "active" as const }])
    .onConflictDoNothing()
    .returning();

  console.log(`${insertedBuildings.length} bâtiments créés`);

  // 4. Créer le cycle actif
  if (insertedBuildings.length > 0) {
    console.log("Création du cycle actif...");
    const buildingId = insertedBuildings[0].id;

    const insertedCycles = await db
      .insert(schema.cycles)
      .values([
        {
          farmId,
          buildingId,
          startDate: "2025-07-17",
          phase: "production" as const,
          initialCount: 600,
          notes: "Cycle principal Bâtiment A - démarré le 17 juillet 2025.",
        },
      ])
      .returning();

    console.log(`${insertedCycles.length} cycles créés`);
  }

  // 5. Créer les paramètres par défaut
  console.log("Création des paramètres...");
  const userId = adminUser?.id ?? null;

  await db
    .insert(schema.settings)
    .values([
      { farmId, key: "prix_plaquette", value: "7000", updatedBy: userId },
      { farmId, key: "nom_ferme", value: "Ferm'Afrik", updatedBy: userId },
      { farmId, key: "devise", value: "XOF", updatedBy: userId },
      { farmId, key: "oeufs_par_plaquette", value: "30", updatedBy: userId },
    ])
    .onConflictDoNothing();

  console.log("Paramètres créés");
  console.log("Seeding terminé avec succès !");
}

seed()
  .catch((error) => {
    console.error("Erreur lors du seeding :", error);
    process.exit(1);
  })
  .finally(() => pool.end());
