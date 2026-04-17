import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyRecords, expenses, sales } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AUTO_FEED_EXPENSE_LABEL } from "@/lib/utils";

interface ReportParams {
  farmId: number;
  cycleId: number;
  cycleStartDate: string;
  initialCount: number;
  totalMortality: number;
  daysParam: string | null;
  reportMonth: string | null;
}

function buildPeriodFilter(
  daysParam: string | null,
  reportMonth: string | null,
  table: { recordDate?: unknown; saleDate?: unknown; expenseDate?: unknown },
  dateColumn: unknown
) {
  if (reportMonth && reportMonth !== "all") {
    return sql`${dateColumn}::text LIKE ${`${reportMonth}%`}`;
  }
  if (daysParam && daysParam !== "all") {
    const n = parseInt(daysParam, 10);
    if (!isNaN(n) && n > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - n);
      return sql`${dateColumn} >= ${cutoff.toISOString().split("T")[0]}`;
    }
  }
  return undefined;
}

export async function handleReport(params: ReportParams) {
  const { farmId, cycleId, cycleStartDate, initialCount, totalMortality, daysParam, reportMonth } = params;
  const effectifVivant = Math.max(0, initialCount - totalMortality);

  const periodFilter = buildPeriodFilter(daysParam, reportMonth, dailyRecords, dailyRecords.recordDate);

  const baseFilter = and(eq(dailyRecords.farmId, farmId), eq(dailyRecords.cycleId, cycleId));
  const records = await db.query.dailyRecords.findMany({
    where: periodFilter ? and(baseFilter, periodFilter) : baseFilter,
    orderBy: [dailyRecords.recordDate],
  });

  // Ponte trend (échantillonné si > 60 points)
  let ponteSample = records;
  if (records.length > 60) {
    const step = Math.ceil(records.length / 60);
    ponteSample = records.filter((_, i) => i % step === 0);
  }
  const ponteTrend = ponteSample.map((r) => ({
    date: format(new Date(r.recordDate + "T00:00:00"), "dd/MM", { locale: fr }),
    tauxPonte: effectifVivant > 0
      ? Math.round((r.eggsCollected / effectifVivant) * 100 * 10) / 10
      : 0,
    oeufs: r.eggsCollected,
  }));

  const mortalityTrend = records
    .filter((r) => r.mortalityCount > 0)
    .map((r) => ({
      date: format(new Date(r.recordDate + "T00:00:00"), "dd/MM", { locale: fr }),
      mortalite: r.mortalityCount,
    }));

  // Filtres ventes & dépenses
  const salesPeriodFilter = buildPeriodFilter(daysParam, reportMonth, sales, sales.saleDate);
  const expensesPeriodFilter = buildPeriodFilter(daysParam, reportMonth, expenses, expenses.expenseDate);

  const salesBase = and(eq(sales.farmId, farmId), eq(sales.cycleId, cycleId));
  const expensesBase = and(eq(expenses.farmId, farmId), eq(expenses.cycleId, cycleId));

  const [filteredSales, filteredExpenses] = await Promise.all([
    db.query.sales.findMany({
      where: salesPeriodFilter ? and(salesBase, salesPeriodFilter) : salesBase,
    }),
    db.query.expenses.findMany({
      where: expensesPeriodFilter ? and(expensesBase, expensesPeriodFilter) : expensesBase,
    }),
  ]);

  const autoFeedExpenseDates = new Set(
    filteredExpenses
      .filter((expense) => expense.label === AUTO_FEED_EXPENSE_LABEL && expense.category === "alimentation")
      .map((expense) => expense.expenseDate)
  );

  const unresolvedFeedCostTotal = records.reduce((sum, record) => {
    if (autoFeedExpenseDates.has(record.recordDate)) return sum;
    return sum + Number(record.feedCost ?? 0);
  }, 0);

  // Revenus vs dépenses par mois
  const monthMap: Record<string, { revenus: number; depenses: number }> = {};
  filteredSales.forEach((s) => {
    const mois = format(new Date(s.saleDate), "MMM yy", { locale: fr });
    if (!monthMap[mois]) monthMap[mois] = { revenus: 0, depenses: 0 };
    monthMap[mois].revenus += Number(s.totalAmount);
  });
  filteredExpenses.forEach((e) => {
    const mois = format(new Date(e.expenseDate), "MMM yy", { locale: fr });
    if (!monthMap[mois]) monthMap[mois] = { revenus: 0, depenses: 0 };
    monthMap[mois].depenses += Number(e.amount);
  });
  records.forEach((r) => {
    if (autoFeedExpenseDates.has(r.recordDate)) return;
    const mois = format(new Date(r.recordDate), "MMM yy", { locale: fr });
    if (!monthMap[mois]) monthMap[mois] = { revenus: 0, depenses: 0 };
    monthMap[mois].depenses += Number(r.feedCost ?? 0);
  });
  const revenueVsExpenses = Object.entries(monthMap).map(([mois, d]) => ({
    mois,
    revenus: d.revenus,
    depenses: d.depenses,
    benefice: d.revenus - d.depenses,
  }));

  // Dépenses par catégorie
  const catMap: Record<string, number> = {};
  filteredExpenses.forEach((e) => {
    catMap[e.category] = (catMap[e.category] ?? 0) + Number(e.amount);
  });
  if (unresolvedFeedCostTotal > 0) {
    catMap["alimentation"] = (catMap["alimentation"] ?? 0) + unresolvedFeedCostTotal;
  }
  const expensesByCategory = Object.entries(catMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  // Totaux
  const totalRevenue = filteredSales.reduce((s, v) => s + Number(v.totalAmount), 0);
  const totalExpenses =
    filteredExpenses.reduce((s, e) => s + Number(e.amount), 0) +
    unresolvedFeedCostTotal;

  const totalEggs = records.reduce((s, r) => s + r.eggsCollected, 0);
  const totalTrays = filteredSales.reduce((s, v) => s + v.traysSold, 0);
  const periodMortality = records.reduce((s, r) => s + r.mortalityCount, 0);
  const avgTauxPonte = records.length > 0 && effectifVivant > 0
    ? Math.round((totalEggs / records.length / effectifVivant) * 100 * 10) / 10
    : 0;

  // Données brutes pour export
  const rawRecords = records.map((r) => ({
    date: r.recordDate,
    oeufs_recoltes: r.eggsCollected,
    oeufs_casses: r.eggsBroken,
    mortalite: r.mortalityCount,
    aliment_kg: r.feedQuantityKg !== null ? Number(r.feedQuantityKg) : 0,
    cout_aliment_xof: r.feedCost !== null ? Number(r.feedCost) : 0,
  }));

  const rawSales = filteredSales.map((s) => ({
    date: s.saleDate,
    type: "vente",
    plaquettes: s.traysSold,
    prix_unitaire_xof: Number(s.unitPrice),
    total_xof: Number(s.totalAmount),
    client: s.buyerName ?? "",
  }));

  const fallbackFeedExpenses = records
    .filter((record) => !autoFeedExpenseDates.has(record.recordDate) && Number(record.feedCost ?? 0) > 0)
    .map((record) => ({
      date: record.recordDate,
      type: "depense",
      libelle: AUTO_FEED_EXPENSE_LABEL,
      categorie: "alimentation",
      montant_xof: Number(record.feedCost),
    }));

  const rawExpenses = [
    ...filteredExpenses.map((e) => ({
      date: e.expenseDate,
      type: "depense",
      libelle: e.label,
      categorie: e.category,
      montant_xof: Number(e.amount),
    })),
    ...fallbackFeedExpenses,
  ];

  const fallbackFeedExpenseEntries = records
    .filter((record) => !autoFeedExpenseDates.has(record.recordDate) && Number(record.feedCost ?? 0) > 0)
    .map((record) => ({
      id: `expense-feed-${record.id}`,
      entryType: "expense" as const,
      date: record.recordDate,
      label: AUTO_FEED_EXPENSE_LABEL,
      details:
        Number(record.feedQuantityKg ?? 0) > 0
          ? `${Number(record.feedQuantityKg ?? 0)} kg aliment`
          : "alimentation",
      amountXof: Number(record.feedCost),
      category: "alimentation",
    }));

  const productionEntries = records
    .map((r) => {
      const productionDetails = [
        r.eggsCollected > 0 ? `${r.eggsCollected} oeufs recoltes` : null,
        r.eggsBroken > 0 ? `${r.eggsBroken} casses` : null,
        r.mortalityCount > 0 ? `${r.mortalityCount} mortalite` : null,
        Number(r.feedQuantityKg ?? 0) > 0 && Number(r.feedCost ?? 0) <= 0
          ? `${Number(r.feedQuantityKg ?? 0)} kg aliment`
          : null,
      ].filter(Boolean);

      if (productionDetails.length === 0) return null;

      return {
        id: `prod-${r.id}`,
        entryType: "production" as const,
        date: r.recordDate,
        label: "Saisie journaliere",
        details: productionDetails.join(" | "),
        eggsCollected: r.eggsCollected,
        eggsBroken: r.eggsBroken,
        mortalityCount: r.mortalityCount,
        feedQuantityKg: Number(r.feedQuantityKg ?? 0),
        amountXof: 0,
        category: "production",
      };
    })
    .filter((entry) => entry !== null);

  const rawEntries = [
    ...productionEntries,
    ...filteredSales.map((s) => ({
      id: `sale-${s.id}`,
      entryType: "sale" as const,
      date: s.saleDate,
      label: s.buyerName?.trim() || "Vente",
      details: `${s.traysSold} plaquette(s) a ${Number(s.unitPrice).toLocaleString("fr-FR")} XOF`,
      traysSold: s.traysSold,
      unitPriceXof: Number(s.unitPrice),
      amountXof: Number(s.totalAmount),
      category: "vente",
    })),
    ...filteredExpenses.map((e) => ({
      id: `expense-${e.id}`,
      entryType: "expense" as const,
      date: e.expenseDate,
      label: e.label,
      details: e.category,
      amountXof: Number(e.amount),
      category: e.category,
    })),
    ...fallbackFeedExpenseEntries,
  ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

  return NextResponse.json({
    ponteTrend,
    mortalityTrend,
    revenueVsExpenses,
    expensesByCategory,
    totalRevenue,
    totalExpenses,
    beneficeNet: totalRevenue - totalExpenses,
    avgTauxPonte,
    totalEggs,
    totalMortality: periodMortality,
    totalTrays,
    cycleStartDate,
    rawRecords,
    rawSales,
    rawExpenses,
    rawEntries,
  });
}
