import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Database source (ancienne version)
const SOURCE_DATABASE_URL = "postgresql://neondb_owner:npg_Jmj80YEVKlTD@ep-autumn-heart-alq7i98q-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sourceSql = neon(SOURCE_DATABASE_URL);
const sourceDb = drizzle(sourceSql, { schema });

async function previewData() {
  console.log("📊 Aperçu des données de l'ancienne base de données\n");
  console.log("=".repeat(80));

  try {
    // 1. Ventes
    console.log("\n📈 VENTES");
    console.log("-".repeat(80));
    try {
      const sales = await sourceDb.query.sales.findMany();
      if (sales.length > 0) {
        console.log(`Total: ${sales.length} ventes\n`);
        sales.slice(0, 5).forEach((sale, i) => {
          console.log(`${i + 1}. Date: ${sale.saleDate}`);
          console.log(`   Plaquettes: ${sale.traysSold} | Prix unitaire: ${sale.unitPrice} XOF`);
          console.log(`   Total: ${sale.totalAmount} XOF | Acheteur: ${sale.buyerName || "-"}`);
          console.log("");
        });
        if (sales.length > 5) {
          console.log(`... et ${sales.length - 5} autres ventes`);
        }
      } else {
        console.log("Aucune vente trouvée");
      }
    } catch (error) {
      console.log("⚠️  Erreur:", error);
    }

    // 2. Saisies quotidiennes
    console.log("\n📝 SAISIES QUOTIDIENNES");
    console.log("-".repeat(80));
    try {
      const dailyRecords = await sourceDb.query.dailyRecords.findMany();
      if (dailyRecords.length > 0) {
        console.log(`Total: ${dailyRecords.length} saisies\n`);
        dailyRecords.slice(0, 5).forEach((record, i) => {
          console.log(`${i + 1}. Date: ${record.recordDate}`);
          console.log(`   Œufs récoltés: ${record.eggsCollected} | Cassés: ${record.eggsBroken}`);
          console.log(`   Mortalité: ${record.mortalityCount} | Alimentation: ${record.feedQuantityKg} kg`);
          console.log("");
        });
        if (dailyRecords.length > 5) {
          console.log(`... et ${dailyRecords.length - 5} autres saisies`);
        }
      } else {
        console.log("Aucune saisie trouvée");
      }
    } catch (error) {
      console.log("⚠️  Erreur:", error);
    }

    // 3. Dépenses
    console.log("\n💰 DÉPENSES");
    console.log("-".repeat(80));
    try {
      const expenses = await sourceDb.query.expenses.findMany();
      if (expenses.length > 0) {
        console.log(`Total: ${expenses.length} dépenses\n`);
        expenses.slice(0, 5).forEach((expense, i) => {
          console.log(`${i + 1}. Date: ${expense.expenseDate}`);
          console.log(`   Libellé: ${expense.label}`);
          console.log(`   Montant: ${expense.amount} XOF | Catégorie: ${expense.category}`);
          console.log("");
        });
        if (expenses.length > 5) {
          console.log(`... et ${expenses.length - 5} autres dépenses`);
        }
      } else {
        console.log("Aucune dépense trouvée");
      }
    } catch (error) {
      console.log("⚠️  Erreur:", error);
    }

    // 4. Santé
    console.log("\n💊 SANTÉ");
    console.log("-".repeat(80));
    try {
      const healthRecords = await sourceDb.query.healthRecords.findMany();
      if (healthRecords.length > 0) {
        console.log(`Total: ${healthRecords.length} enregistrements\n`);
        healthRecords.slice(0, 5).forEach((record, i) => {
          console.log(`${i + 1}. Date: ${record.recordDate}`);
          console.log(`   Type: ${record.type} | Produit: ${record.productName}`);
          console.log(`   Dose: ${record.dose || "-"} | Coût: ${record.cost || "0"} XOF`);
          console.log("");
        });
        if (healthRecords.length > 5) {
          console.log(`... et ${healthRecords.length - 5} autres enregistrements`);
        }
      } else {
        console.log("Aucun enregistrement de santé trouvé");
      }
    } catch (error) {
      console.log("⚠️  Erreur:", error);
    }

    // 5. Stocks d'aliments
    console.log("\n🌾 STOCKS D'ALIMENTS");
    console.log("-".repeat(80));
    try {
      const feedStock = await sourceDb.query.feedStock.findMany();
      if (feedStock.length > 0) {
        console.log(`Total: ${feedStock.length} mouvements\n`);
        feedStock.slice(0, 5).forEach((stock, i) => {
          console.log(`${i + 1}. Date: ${stock.movementDate}`);
          console.log(`   Type: ${stock.movementType} | Quantité: ${stock.quantityKg} kg`);
          console.log(`   Type aliment: ${stock.feedType} | Coût: ${stock.totalCost || "0"} XOF`);
          console.log("");
        });
        if (feedStock.length > 5) {
          console.log(`... et ${feedStock.length - 5} autres mouvements`);
        }
      } else {
        console.log("Aucun mouvement de stock trouvé");
      }
    } catch (error) {
      console.log("⚠️  Erreur:", error);
    }

    console.log("\n" + "=".repeat(80));
    console.log("\n✅ Aperçu terminé. Ces données seront migrées dans la nouvelle base.");
  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

previewData();
