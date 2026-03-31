import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  dailyRecords,
  buildings,
  cycles,
  expenses,
  sales,
} from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";
import { canWrite } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const dailyRecordSchema = z.object({
  buildingId: z.number(),
  cycleId: z.number(),
  recordDate: z.string().max(10),
  eggsCollected: z.number().min(0).default(0),
  eggsBroken: z.number().min(0).default(0),
  mortalityCount: z.number().min(0).default(0),
  mortalityCause: z.string().max(500).optional(),
  feedQuantityKg: z.number().min(0).optional(),
  feedType: z.enum(["demarrage", "croissance", "ponte"]).optional(),
  feedCost: z.number().min(0).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const info = searchParams.get("info");
  const report = searchParams.get("report");
  const month = searchParams.get("month");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const recent = searchParams.get("recent");

  // Saisies récentes (14 dernières) pour l'historique
  if (recent === "true") {
    const building = await db.query.buildings.findFirst({
      where: eq(buildings.status, "active"),
    });
    if (!building) return NextResponse.json({ records: [] });
    const cycle = await db.query.cycles.findFirst({
      where: eq(cycles.buildingId, building.id),
      orderBy: desc(cycles.id),
    });
    if (!cycle) return NextResponse.json({ records: [] });
    const records = await db.query.dailyRecords.findMany({
      where: eq(dailyRecords.cycleId, cycle.id),
      orderBy: [desc(dailyRecords.recordDate)],
      limit: 14,
    });
    return NextResponse.json({ records });
  }

  // Production mensuelle pour MonthlyProduction (période 18→17 ou mois calendaire)
  if ((month || (startDateParam && endDateParam)) && report !== "true") {
    const building = await db.query.buildings.findFirst({
      where: eq(buildings.status, "active"),
    });
    if (!building) {
      return NextResponse.json({ error: "Aucun bâtiment actif" }, { status: 404 });
    }
    const cycle = await db.query.cycles.findFirst({
      where: eq(cycles.buildingId, building.id),
      orderBy: desc(cycles.id),
    });
    if (!cycle) {
      return NextResponse.json({ error: "Aucun cycle actif" }, { status: 404 });
    }

    // Effectif vivant du cycle
    const mortalityAgg = await db
      .select({
        total: sql<number>`COALESCE(SUM(${dailyRecords.mortalityCount}), 0)`,
      })
      .from(dailyRecords)
      .where(eq(dailyRecords.cycleId, cycle.id));
    const totalMortality = Number(mortalityAgg[0]?.total ?? 0);
    const effectifVivant = Math.max(0, cycle.initialCount - totalMortality);

    // Récupérer les records de la période demandée (18→17 ou mois calendaire)
    const dateFilter =
      startDateParam && endDateParam
        ? and(
            sql`${dailyRecords.recordDate} >= ${startDateParam}`,
            sql`${dailyRecords.recordDate} <= ${endDateParam}`
          )
        : sql`${dailyRecords.recordDate}::text LIKE ${`${month}%`}`;

    const monthRecords = await db.query.dailyRecords.findMany({
      where: and(eq(dailyRecords.cycleId, cycle.id), dateFilter),
      orderBy: [dailyRecords.recordDate],
    });

    const totalEggs = monthRecords.reduce((s, r) => s + r.eggsCollected, 0);
    const totalBroken = monthRecords.reduce((s, r) => s + r.eggsBroken, 0);
    const joursSaisis = monthRecords.length;
    const avgTauxPonte =
      joursSaisis > 0 && effectifVivant > 0
        ? Math.round(
            (monthRecords.reduce(
              (s, r) => s + (r.eggsCollected / effectifVivant) * 100,
              0
            ) /
              joursSaisis) *
              10
          ) / 10
        : 0;

    const records = monthRecords.map((r) => ({
      date: format(new Date(r.recordDate + "T00:00:00"), "dd/MM", { locale: fr }),
      oeufs: r.eggsCollected,
      tauxPonte:
        effectifVivant > 0
          ? Math.round((r.eggsCollected / effectifVivant) * 100 * 10) / 10
          : 0,
    }));

    return NextResponse.json({
      records,
      totalEggs,
      totalBroken,
      avgTauxPonte,
      joursSaisis,
    });
  }

  // Infos bâtiment/cycle actif
  if (info === "true") {
    const building = await db.query.buildings.findFirst({
      where: eq(buildings.status, "active"),
    });
    if (!building) {
      return NextResponse.json({ error: "Aucun bâtiment actif" }, { status: 404 });
    }
    const cycle = await db.query.cycles.findFirst({
      where: eq(cycles.buildingId, building.id),
      orderBy: desc(cycles.id),
    });
    if (!cycle) {
      return NextResponse.json({ error: "Aucun cycle actif" }, { status: 404 });
    }
    return NextResponse.json({
      buildingId: building.id,
      buildingName: building.name,
      cycleId: cycle.id,
    });
  }

  // Données pour les rapports
  if (report === "true") {
    const building = await db.query.buildings.findFirst({
      where: eq(buildings.status, "active"),
    });
    if (!building) return NextResponse.json({});

    const cycle = await db.query.cycles.findFirst({
      where: eq(cycles.buildingId, building.id),
      orderBy: desc(cycles.id),
    });
    if (!cycle) return NextResponse.json({});

    const daysParam = searchParams.get("days");
    // month peut être "yyyy-MM" ou "all" quand report=true
    const reportMonth = searchParams.get("month");

    // Construire le filtre de période directement en SQL
    let periodFilter: ReturnType<typeof and> | undefined;
    if (reportMonth && reportMonth !== "all") {
      periodFilter = sql`${dailyRecords.recordDate}::text LIKE ${`${reportMonth}%`}`;
    } else if (daysParam && daysParam !== "all") {
      const n = parseInt(daysParam, 10);
      if (!isNaN(n) && n > 0) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - n);
        const cutoffStr = cutoff.toISOString().split("T")[0];
        periodFilter = sql`${dailyRecords.recordDate} >= ${cutoffStr}`;
      }
    }

    // Mortalité totale du cycle (toujours sur tout le cycle)
    const [mortalityAgg] = await db
      .select({ total: sql<number>`COALESCE(SUM(${dailyRecords.mortalityCount}), 0)` })
      .from(dailyRecords)
      .where(eq(dailyRecords.cycleId, cycle.id));
    const totalMortality = Number(mortalityAgg?.total ?? 0);
    const effectifVivant = Math.max(0, cycle.initialCount - totalMortality);

    // Records filtrés par période via SQL
    const records = await db.query.dailyRecords.findMany({
      where: periodFilter
        ? and(eq(dailyRecords.cycleId, cycle.id), periodFilter)
        : eq(dailyRecords.cycleId, cycle.id),
      orderBy: [dailyRecords.recordDate],
    });

    // Taux de ponte — sous-échantillonner si trop de points
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

    // Construire les filtres SQL pour sales et expenses
    let salesPeriodFilter: ReturnType<typeof and> | undefined;
    let expensesPeriodFilter: ReturnType<typeof and> | undefined;
    if (reportMonth && reportMonth !== "all") {
      salesPeriodFilter = sql`${sales.saleDate}::text LIKE ${`${reportMonth}%`}`;
      expensesPeriodFilter = sql`${expenses.expenseDate}::text LIKE ${`${reportMonth}%`}`;
    } else if (daysParam && daysParam !== "all") {
      const n = parseInt(daysParam, 10);
      if (!isNaN(n) && n > 0) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - n);
        const cutoffStr = cutoff.toISOString().split("T")[0];
        salesPeriodFilter = sql`${sales.saleDate} >= ${cutoffStr}`;
        expensesPeriodFilter = sql`${expenses.expenseDate} >= ${cutoffStr}`;
      }
    }

    const [filteredSales, filteredExpenses] = await Promise.all([
      db.query.sales.findMany({
        where: salesPeriodFilter
          ? and(eq(sales.cycleId, cycle.id), salesPeriodFilter)
          : eq(sales.cycleId, cycle.id),
      }),
      db.query.expenses.findMany({
        where: expensesPeriodFilter
          ? and(eq(expenses.cycleId, cycle.id), expensesPeriodFilter)
          : eq(expenses.cycleId, cycle.id),
      }),
    ]);

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
    // Alimentation (feed cost)
    const feedTotal = records.reduce((s, r) => s + Number(r.feedCost ?? 0), 0);
    if (feedTotal > 0) catMap["alimentation"] = (catMap["alimentation"] ?? 0) + feedTotal;
    const expensesByCategory = Object.entries(catMap)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    const totalRevenue = filteredSales.reduce((s, v) => s + Number(v.totalAmount), 0);
    const totalExpenses =
      filteredExpenses.reduce((s, e) => s + Number(e.amount), 0) +
      records.reduce((s, r) => s + Number(r.feedCost ?? 0), 0);

    const totalEggs = records.reduce((s, r) => s + r.eggsCollected, 0);
    const totalTrays = filteredSales.reduce((s, v) => s + v.traysSold, 0);
    const periodMortality = records.reduce((s, r) => s + r.mortalityCount, 0);
    const avgTauxPonte = records.length > 0 && effectifVivant > 0
      ? Math.round((totalEggs / records.length / effectifVivant) * 100 * 10) / 10
      : 0;

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

    const rawExpenses = filteredExpenses.map((e) => ({
      date: e.expenseDate,
      type: "depense",
      libelle: e.label,
      categorie: e.category,
      montant_xof: Number(e.amount),
    }));

    const rawEntries = [
      ...records.map((r) => ({
        id: `prod-${r.id}`,
        entryType: "production" as const,
        date: r.recordDate,
        label: "Saisie journaliere",
        details: [
          `${r.eggsCollected} oeufs recoltes`,
          r.eggsBroken > 0 ? `${r.eggsBroken} casses` : null,
          r.mortalityCount > 0 ? `${r.mortalityCount} mortalite` : null,
          Number(r.feedQuantityKg ?? 0) > 0
            ? `${Number(r.feedQuantityKg ?? 0)} kg aliment`
            : null,
        ]
          .filter(Boolean)
          .join(" | "),
        eggsCollected: r.eggsCollected,
        eggsBroken: r.eggsBroken,
        mortalityCount: r.mortalityCount,
        feedQuantityKg: Number(r.feedQuantityKg ?? 0),
        amountXof: Number(r.feedCost ?? 0),
        category: "production",
      })),
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
      cycleStartDate: cycle.startDate,
      rawRecords,
      rawSales,
      rawExpenses,
      rawEntries,
    });
  }

  // Liste des saisies (paginée)
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const limit = Math.min(Math.max(parseInt(limitParam ?? "50", 10) || 50, 1), 200);
  const offset = Math.max(parseInt(offsetParam ?? "0", 10) || 0, 0);

  const [records, totalCount] = await Promise.all([
    db.query.dailyRecords.findMany({
      orderBy: [desc(dailyRecords.recordDate)],
      limit,
      offset,
    }),
    db.select({ count: sql<number>`COUNT(*)` }).from(dailyRecords),
  ]);

  return NextResponse.json({
    records,
    pagination: { limit, offset, total: Number(totalCount[0]?.count ?? 0) },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!canWrite(session.user.role)) {
    return NextResponse.json({ error: "Mode démo : lecture seule" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = dailyRecordSchema.parse(body);

    // Calculer le revenue (vendu directement en saisie)
    const revenue = 0; // Les ventes directes passent par /api/sales

    // Upsert : une saisie par bâtiment par jour
    const existing = await db.query.dailyRecords.findFirst({
      where: and(
        eq(dailyRecords.buildingId, data.buildingId),
        eq(dailyRecords.recordDate, data.recordDate)
      ),
    });

    const userId = parseInt(session.user.id);

    if (existing) {
      // Mise à jour
      await db
        .update(dailyRecords)
        .set({
          eggsCollected: data.eggsCollected,
          eggsBroken: data.eggsBroken,
          mortalityCount: data.mortalityCount,
          mortalityCause: data.mortalityCause,
          feedQuantityKg: data.feedQuantityKg?.toString(),
          feedType: data.feedType,
          feedCost: data.feedCost?.toString(),
          updatedAt: new Date(),
        })
        .where(eq(dailyRecords.id, existing.id));

      return NextResponse.json({ success: true, id: existing.id, updated: true });
    } else {
      // Nouvelle saisie
      const inserted = await db
        .insert(dailyRecords)
        .values({
          cycleId: data.cycleId,
          buildingId: data.buildingId,
          recordDate: data.recordDate,
          eggsCollected: data.eggsCollected,
          eggsBroken: data.eggsBroken,
          eggsSold: 0,
          mortalityCount: data.mortalityCount,
          mortalityCause: data.mortalityCause,
          feedQuantityKg: data.feedQuantityKg?.toString(),
          feedType: data.feedType,
          feedCost: data.feedCost?.toString(),
          revenue: "0",
          createdBy: isNaN(userId) ? null : userId,
        })
        .returning();

      return NextResponse.json({ success: true, id: inserted[0].id, updated: false });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Erreur saisie journalière:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
