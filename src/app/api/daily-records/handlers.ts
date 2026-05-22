/**
 * Handlers pour GET /api/daily-records
 * Fichier extrait pour eviter un fichier route.ts trop volumineux (>300 lignes)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyRecords, buildings, cycles, expenses } from "@/db/schema";
import { eq, desc, and, sql, inArray, gte, lte } from "drizzle-orm";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DEFAULT_PAGINATION_LIMIT, MAX_PAGINATION_LIMIT } from "@/lib/constants";
import { handleReport } from "./report";
import { parseDailyRecordExpenseLabel } from "@/lib/daily-record-linked-expense";

async function getActiveBuilding(farmId: number) {
  return db.query.buildings.findFirst({
    where: and(eq(buildings.farmId, farmId), eq(buildings.status, "active")),
  });
}

async function getActiveCycle(farmId: number, buildingId: number) {
  return db.query.cycles.findFirst({
    where: and(eq(cycles.farmId, farmId), eq(cycles.buildingId, buildingId)),
    orderBy: desc(cycles.id),
  });
}

async function getCycleMortality(farmId: number, cycleId: number) {
  const [agg] = await db
    .select({ total: sql<number>`COALESCE(SUM(${dailyRecords.mortalityCount}), 0)` })
    .from(dailyRecords)
    .where(and(eq(dailyRecords.farmId, farmId), eq(dailyRecords.cycleId, cycleId)));
  return Number(agg?.total ?? 0);
}

async function enrichRecordsWithLinkedExpenses(
  farmId: number,
  records: Array<typeof dailyRecords.$inferSelect>
) {
  if (records.length === 0) {
    return records.map((record) => ({
      ...record,
      linkedExpenseId: null,
      linkedExpenseLabel: null,
      linkedExpenseAmount: null,
      linkedExpenseCategory: null,
    }));
  }

  const recordDates = [...new Set(records.map((record) => record.recordDate))];
  const linkedExpenses = await db.query.expenses.findMany({
    where: and(
      eq(expenses.farmId, farmId),
      inArray(expenses.expenseDate, recordDates)
    ),
    orderBy: [desc(expenses.createdAt)],
  });

  const expenseEntries: Array<
    readonly [number, { id: number; label: string; amount: string; category: string }]
  > = [];

  for (const expense of linkedExpenses) {
    const parsed = parseDailyRecordExpenseLabel(expense.label);
    if (!parsed) continue;

    expenseEntries.push([
      parsed.recordId,
      {
        id: expense.id,
        label: parsed.label,
        amount: expense.amount,
        category: expense.category,
      },
    ] as const);
  }

  const expenseByRecordId = new Map(expenseEntries);

  return records.map((record) => {
    const linkedExpense = expenseByRecordId.get(record.id);
    return {
      ...record,
      linkedExpenseId: linkedExpense?.id ?? null,
      linkedExpenseLabel: linkedExpense?.label ?? null,
      linkedExpenseAmount: linkedExpense?.amount ?? null,
      linkedExpenseCategory: linkedExpense?.category ?? null,
    };
  });
}

export async function handleRecent(farmId: number) {
  const building = await getActiveBuilding(farmId);
  if (!building) return NextResponse.json({ records: [] });

  const cycle = await getActiveCycle(farmId, building.id);
  if (!cycle) return NextResponse.json({ records: [] });

  const records = await db.query.dailyRecords.findMany({
    where: and(eq(dailyRecords.farmId, farmId), eq(dailyRecords.cycleId, cycle.id)),
    orderBy: [desc(dailyRecords.recordDate)],
    limit: 14,
  });

  return NextResponse.json({
    records: await enrichRecordsWithLinkedExpenses(farmId, records),
  });
}

export async function handleMonthly(
  farmId: number,
  month: string | null,
  startDateParam: string | null,
  endDateParam: string | null
) {
  const building = await getActiveBuilding(farmId);
  if (!building) return NextResponse.json({ error: "Aucun batiment actif" }, { status: 404 });

  const cycle = await getActiveCycle(farmId, building.id);
  if (!cycle) return NextResponse.json({ error: "Aucun cycle actif" }, { status: 404 });

  const totalMortality = await getCycleMortality(farmId, cycle.id);
  const effectifVivant = Math.max(0, cycle.initialCount - totalMortality);

  const dateFilter =
    startDateParam && endDateParam
      ? and(
          sql`${dailyRecords.recordDate} >= ${startDateParam}`,
          sql`${dailyRecords.recordDate} <= ${endDateParam}`
        )
      : sql`${dailyRecords.recordDate}::text LIKE ${`${month}%`}`;

  const monthRecords = await db.query.dailyRecords.findMany({
    where: and(eq(dailyRecords.farmId, farmId), eq(dailyRecords.cycleId, cycle.id), dateFilter),
    orderBy: [dailyRecords.recordDate],
  });

  const totalEggs = monthRecords.reduce((sum, record) => sum + record.eggsCollected, 0);
  const totalBroken = monthRecords.reduce((sum, record) => sum + record.eggsBroken, 0);
  const joursSaisis = monthRecords.length;
  const avgTauxPonte =
    joursSaisis > 0 && effectifVivant > 0
      ? Math.round(
          (
            monthRecords.reduce(
              (sum, record) => sum + (record.eggsCollected / effectifVivant) * 100,
              0
            ) / joursSaisis
          ) * 10
        ) / 10
      : 0;

  const records = monthRecords.map((record) => ({
    date: format(new Date(`${record.recordDate}T00:00:00`), "dd/MM", { locale: fr }),
    oeufs: record.eggsCollected,
    tauxPonte:
      effectifVivant > 0
        ? Math.round((record.eggsCollected / effectifVivant) * 100 * 10) / 10
        : 0,
  }));

  return NextResponse.json({ records, totalEggs, totalBroken, avgTauxPonte, joursSaisis });
}

export async function handleInfo(farmId: number) {
  const building = await getActiveBuilding(farmId);
  if (!building) return NextResponse.json({ error: "Aucun batiment actif" }, { status: 404 });

  const cycle = await getActiveCycle(farmId, building.id);
  if (!cycle) return NextResponse.json({ error: "Aucun cycle actif" }, { status: 404 });

  const totalMortality = await getCycleMortality(farmId, cycle.id);
  const effectifVivant = Math.max(0, cycle.initialCount - totalMortality);

  return NextResponse.json({
    buildingId: building.id,
    buildingName: building.name,
    cycleId: cycle.id,
    initialCount: cycle.initialCount,
    totalMortality,
    effectifVivant,
  });
}

export async function handleReportMode(farmId: number, searchParams: URLSearchParams) {
  const building = await getActiveBuilding(farmId);
  if (!building) return NextResponse.json({});

  const cycle = await getActiveCycle(farmId, building.id);
  if (!cycle) return NextResponse.json({});

  const totalMortality = await getCycleMortality(farmId, cycle.id);

  return handleReport({
    farmId,
    cycleId: cycle.id,
    cycleStartDate: cycle.startDate,
    initialCount: cycle.initialCount,
    totalMortality,
    daysParam: searchParams.get("days"),
    reportMonth: searchParams.get("month"),
  });
}

export async function handleList(farmId: number, searchParams: URLSearchParams) {
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const activeCycleOnly = searchParams.get("activeCycle") === "true";

  const limit = Math.min(
    Math.max(parseInt(limitParam ?? DEFAULT_PAGINATION_LIMIT.toString(), 10) || DEFAULT_PAGINATION_LIMIT, 1),
    MAX_PAGINATION_LIMIT
  );
  const offset = Math.max(parseInt(offsetParam ?? "0", 10) || 0, 0);

  const filters = [eq(dailyRecords.farmId, farmId)];

  if (activeCycleOnly) {
    const building = await getActiveBuilding(farmId);
    if (!building) {
      return NextResponse.json({
        records: [],
        pagination: { limit, offset, total: 0 },
      });
    }

    const cycle = await getActiveCycle(farmId, building.id);
    if (!cycle) {
      return NextResponse.json({
        records: [],
        pagination: { limit, offset, total: 0 },
      });
    }

    filters.push(eq(dailyRecords.cycleId, cycle.id));
  }

  if (fromDate) filters.push(gte(dailyRecords.recordDate, fromDate));
  if (toDate) filters.push(lte(dailyRecords.recordDate, toDate));

  const whereClause = and(...filters);

  const [recordsList, totalCount] = await Promise.all([
    db.query.dailyRecords.findMany({
      where: whereClause,
      orderBy: [desc(dailyRecords.recordDate)],
      limit,
      offset,
    }),
    db.select({ count: sql<number>`COUNT(*)` }).from(dailyRecords).where(whereClause),
  ]);

  return NextResponse.json({
    records: await enrichRecordsWithLinkedExpenses(farmId, recordsList),
    pagination: { limit, offset, total: Number(totalCount[0]?.count ?? 0) },
  });
}
