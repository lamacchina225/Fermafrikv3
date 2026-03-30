import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Database source (ancienne version)
const SOURCE_DATABASE_URL = "postgresql://neondb_owner:npg_Jmj80YEVKlTD@ep-autumn-heart-alq7i98q-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// Database destination (nouvelle version)
const DEST_DATABASE_URL = process.env.DATABASE_URL;
if (!DEST_DATABASE_URL) {
  throw new Error("DATABASE_URL est requis dans les variables d'environnement");
}

const sourceSql = neon(SOURCE_DATABASE_URL);
const sourceDb = drizzle(sourceSql, { schema });

const destSql = neon(DEST_DATABASE_URL);
const destDb = drizzle(destSql, { schema });

async function migrateRealData() {
  console.log("🚀 Début de la migration des données réelles...");

  try {
    // 1. Migrer les ventes (sans clients pour l'instant)
    console.log("📦 Migration des ventes...");
    try {
      const sourceSales = await sourceDb.query.sales.findMany();
      if (sourceSales.length > 0) {
        await destDb.insert(schema.sales).values(
          sourceSales.map(s => ({
            cycleId: s.cycleId,
            buildingId: s.buildingId,
            saleDate: s.saleDate,
            traysSold: s.traysSold,
            unitPrice: s.unitPrice,
            totalAmount: s.totalAmount,
            clientId: null, // Pas de clients dans l'ancienne base
            buyerName: s.buyerName,
            createdBy: s.createdBy,
          }))
        ).onConflictDoNothing();
        console.log(`✅ ${sourceSales.length} ventes migrées`);
      } else {
        console.log("ℹ️  Aucune vente trouvée dans la source");
      }
    } catch (error) {
      console.log("⚠️  Erreur lors de la migration des ventes:", error);
    }

    // 2. Migrer les saisies quotidiennes
    console.log("📦 Migration des saisies quotidiennes...");
    try {
      const sourceDailyRecords = await sourceDb.query.dailyRecords.findMany();
      if (sourceDailyRecords.length > 0) {
        await destDb.insert(schema.dailyRecords).values(
          sourceDailyRecords.map(d => ({
            cycleId: d.cycleId,
            buildingId: d.buildingId,
            recordDate: d.recordDate,
            eggsCollected: d.eggsCollected,
            eggsBroken: d.eggsBroken,
            eggsSold: d.eggsSold,
            salePricePerTray: d.salePricePerTray,
            revenue: d.revenue,
            mortalityCount: d.mortalityCount,
            mortalityCause: d.mortalityCause,
            feedQuantityKg: d.feedQuantityKg,
            feedType: d.feedType,
            feedCost: d.feedCost,
            createdBy: d.createdBy,
          }))
        ).onConflictDoNothing();
        console.log(`✅ ${sourceDailyRecords.length} saisies quotidiennes migrées`);
      } else {
        console.log("ℹ️  Aucune saisie quotidienne trouvée dans la source");
      }
    } catch (error) {
      console.log("⚠️  Erreur lors de la migration des saisies quotidiennes:", error);
    }

    // 3. Migrer les dépenses
    console.log("📦 Migration des dépenses...");
    try {
      const sourceExpenses = await sourceDb.query.expenses.findMany();
      if (sourceExpenses.length > 0) {
        await destDb.insert(schema.expenses).values(
          sourceExpenses.map(e => ({
            cycleId: e.cycleId,
            buildingId: e.buildingId,
            expenseDate: e.expenseDate,
            label: e.label,
            amount: e.amount,
            category: e.category,
            createdBy: e.createdBy,
          }))
        ).onConflictDoNothing();
        console.log(`✅ ${sourceExpenses.length} dépenses migrées`);
      } else {
        console.log("ℹ️  Aucune dépense trouvée dans la source");
      }
    } catch (error) {
      console.log("⚠️  Erreur lors de la migration des dépenses:", error);
    }

    // 4. Migrer les enregistrements de santé
    console.log("📦 Migration des enregistrements de santé...");
    try {
      const sourceHealthRecords = await sourceDb.query.healthRecords.findMany();
      if (sourceHealthRecords.length > 0) {
        await destDb.insert(schema.healthRecords).values(
          sourceHealthRecords.map(h => ({
            cycleId: h.cycleId,
            buildingId: h.buildingId,
            recordDate: h.recordDate,
            type: h.type,
            productName: h.productName,
            dose: h.dose,
            cost: h.cost,
            notes: h.notes,
            createdBy: h.createdBy,
          }))
        ).onConflictDoNothing();
        console.log(`✅ ${sourceHealthRecords.length} enregistrements de santé migrés`);
      } else {
        console.log("ℹ️  Aucun enregistrement de santé trouvé dans la source");
      }
    } catch (error) {
      console.log("⚠️  Erreur lors de la migration des enregistrements de santé:", error);
    }

    // 5. Migrer les stocks d'aliments
    console.log("📦 Migration des stocks d'aliments...");
    try {
      const sourceFeedStock = await sourceDb.query.feedStock.findMany();
      if (sourceFeedStock.length > 0) {
        await destDb.insert(schema.feedStock).values(
          sourceFeedStock.map(f => ({
            buildingId: f.buildingId,
            movementDate: f.movementDate,
            movementType: f.movementType,
            quantityKg: f.quantityKg,
            unitCost: f.unitCost,
            totalCost: f.totalCost,
            feedType: f.feedType,
            notes: f.notes,
            createdBy: f.createdBy,
          }))
        ).onConflictDoNothing();
        console.log(`✅ ${sourceFeedStock.length} mouvements de stock migrés`);
      } else {
        console.log("ℹ️  Aucun mouvement de stock trouvé dans la source");
      }
    } catch (error) {
      console.log("⚠️  Erreur lors de la migration des stocks d'aliments:", error);
    }

    console.log("\n🎉 Migration terminée avec succès !");
    console.log("\n📝 Note: La table 'clients' n'existait pas dans l'ancienne base.");
    console.log("   Vous pouvez créer des clients via l'interface d'administration.");
  } catch (error) {
    console.error("❌ Erreur lors de la migration:", error);
    throw error;
  }
}

migrateRealData().catch((error) => {
  console.error("Erreur fatale:", error);
  process.exit(1);
});
