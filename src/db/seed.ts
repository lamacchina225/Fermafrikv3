import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as bcrypt from "bcryptjs";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL est requis dans les variables d'environnement");
}

const pool = mysql.createPool(DATABASE_URL);
const db = drizzle(pool, { schema, mode: "default" });

async function seed() {
  console.log("Démarrage du seeding...");

  // 1. Créer les utilisateurs
  console.log("Création des utilisateurs...");
  const adminHash = await bcrypt.hash("290686", 10);
  const gestionHash = await bcrypt.hash("gestion", 10);
  const demoHash = await bcrypt.hash("demo", 10);

  const existingUsers = await db.select().from(schema.users);
  if (existingUsers.length === 0) {
    await db.insert(schema.users).values([
      { username: "admin", passwordHash: adminHash, role: "admin" },
      { username: "gestion", passwordHash: gestionHash, role: "gestionnaire" },
      { username: "demo", passwordHash: demoHash, role: "demo" },
    ]);
    console.log("3 utilisateurs créés");
  } else {
    console.log(`${existingUsers.length} utilisateurs déjà présents, skip.`);
  }

  // 2. Créer le bâtiment A
  console.log("Création du bâtiment A...");
  const existingBuildings = await db.select().from(schema.buildings);
  if (existingBuildings.length === 0) {
    await db.insert(schema.buildings).values([{ name: "Bâtiment A", capacity: 600, status: "active" }]);
    console.log("1 bâtiment créé");
  } else {
    console.log(`${existingBuildings.length} bâtiments déjà présents, skip.`);
  }

  const insertedBuildings = await db.select().from(schema.buildings).limit(1);

  // 3. Créer le cycle actif
  if (insertedBuildings.length > 0) {
    const existingCycles = await db.select().from(schema.cycles);
    if (existingCycles.length === 0) {
      console.log("Création du cycle actif...");
      const buildingId = insertedBuildings[0].id;
      await db.insert(schema.cycles).values([
        {
          buildingId: buildingId,
          startDate: "2025-07-17",
          phase: "production",
          initialCount: 600,
          notes: "Cycle principal Bâtiment A - démarré le 17 juillet 2025. Phase production depuis janvier 2026.",
        },
      ]);
      console.log("1 cycle créé");
    }
  }

  // 4. Créer les paramètres par défaut
  console.log("Création des paramètres...");
  const adminUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.username, "admin"),
  });

  if (adminUser) {
    const existingSettings = await db.select().from(schema.settings);
    if (existingSettings.length === 0) {
      await db.insert(schema.settings).values([
        { key: "prix_plaquette", value: "7000", updatedBy: adminUser.id },
        { key: "nom_ferme", value: "Ferm'Afrik", updatedBy: adminUser.id },
        { key: "devise", value: "XOF", updatedBy: adminUser.id },
        { key: "oeufs_par_plaquette", value: "30", updatedBy: adminUser.id },
      ]);
      console.log("Paramètres créés");
    }
  }

  console.log("Seeding terminé avec succès !");
}

seed().catch((error) => {
  console.error("Erreur lors du seeding :", error);
  process.exit(1);
});

