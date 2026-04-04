import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as bcrypt from "bcryptjs";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL est requis dans les variables d'environnement");
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

async function seed() {
  console.log("Démarrage du seeding...");

  // 1. Créer les utilisateurs
  console.log("Création des utilisateurs...");
  const adminHash = await bcrypt.hash("290686", 10);
  const gestionHash = await bcrypt.hash("gestion", 10);
  const demoHash = await bcrypt.hash("demo", 10);

  const insertedUsers = await db
    .insert(schema.users)
    .values([
      {
        username: "admin",
        passwordHash: adminHash,
        role: "admin",
      },
      {
        username: "gestion",
        passwordHash: gestionHash,
        role: "gestionnaire",
      },
      {
        username: "demo",
        passwordHash: demoHash,
        role: "demo",
      },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`${insertedUsers.length} utilisateurs créés`);

  // 2. Créer le bâtiment A
  console.log("Création du bâtiment A...");
  const insertedBuildings = await db
    .insert(schema.buildings)
    .values([
      {
        name: "Bâtiment A",
        capacity: 600,
        status: "active",
      },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`${insertedBuildings.length} bâtiments créés`);

  // 3. Créer le cycle actif
  if (insertedBuildings.length > 0) {
    console.log("Création du cycle actif...");
    const buildingId = insertedBuildings[0].id;

    const insertedCycles = await db
      .insert(schema.cycles)
      .values([
        {
          buildingId: buildingId,
          startDate: "2025-07-17",
          phase: "production",
          initialCount: 600,
          notes:
            "Cycle principal Bâtiment A - démarré le 17 juillet 2025. Phase production depuis janvier 2026.",
        },
      ])
      .returning();

    console.log(`${insertedCycles.length} cycles créés`);
  }

  // 4. Créer les paramètres par défaut
  console.log("Création des paramètres...");
  const adminUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.username, "admin"),
  });

  if (adminUser) {
    await db
      .insert(schema.settings)
      .values([
        {
          key: "prix_plaquette",
          value: "7000",
          updatedBy: adminUser.id,
        },
        {
          key: "nom_ferme",
          value: "Ferm'Afrik",
          updatedBy: adminUser.id,
        },
        {
          key: "devise",
          value: "XOF",
          updatedBy: adminUser.id,
        },
        {
          key: "oeufs_par_plaquette",
          value: "30",
          updatedBy: adminUser.id,
        },
      ])
      .onConflictDoNothing();

    console.log("Paramètres créés");
  }

  console.log("Seeding terminé avec succès !");
}

seed()
  .catch((error) => {
    console.error("Erreur lors du seeding :", error);
    process.exit(1);
  })
  .finally(() => pool.end());
