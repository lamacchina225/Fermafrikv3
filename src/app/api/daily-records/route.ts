import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyRecords, expenses } from "@/db/schema";
import { eq, and, like, ne } from "drizzle-orm";
import { z } from "zod";
import { withAuth, requireWrite, type AuthContext } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import {
  buildDailyRecordExpenseLabel,
  getDailyRecordExpenseLikePattern,
} from "@/lib/daily-record-linked-expense";
import {
  handleRecent,
  handleMonthly,
  handleInfo,
  handleReportMode,
  handleList,
} from "./handlers";

const dailyRecordSchema = z.object({
  recordId: z.number().int().positive().optional(),
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
  linkedExpense: z.object({
    label: z.string().trim().min(1).max(200),
    amount: z.number().min(0.01),
    category: z.enum(["alimentation", "sante", "energie", "main_oeuvre", "equipement", "autre"]),
  }).optional(),
});

async function syncLinkedExpense(
  ctx: AuthContext,
  recordId: number,
  payload: {
    cycleId: number;
    buildingId: number;
    recordDate: string;
    linkedExpense?: {
      label: string;
      amount: number;
      category: "alimentation" | "sante" | "energie" | "main_oeuvre" | "equipement" | "autre";
    };
  }
) {
  const existingExpense = await db.query.expenses.findFirst({
    where: and(
      eq(expenses.farmId, ctx.farmId),
      like(expenses.label, getDailyRecordExpenseLikePattern(recordId))
    ),
  });

  if (!payload.linkedExpense) {
    if (existingExpense) {
      await db.delete(expenses).where(eq(expenses.id, existingExpense.id));
    }
    return;
  }

  const label = buildDailyRecordExpenseLabel(recordId, payload.linkedExpense.label);

  if (existingExpense) {
    await db
      .update(expenses)
      .set({
        cycleId: payload.cycleId,
        buildingId: payload.buildingId,
        expenseDate: payload.recordDate,
        label,
        amount: payload.linkedExpense.amount.toString(),
        category: payload.linkedExpense.category,
      })
      .where(eq(expenses.id, existingExpense.id));
    return;
  }

  await db.insert(expenses).values({
    farmId: ctx.farmId,
    cycleId: payload.cycleId,
    buildingId: payload.buildingId,
    expenseDate: payload.recordDate,
    label,
    amount: payload.linkedExpense.amount.toString(),
    category: payload.linkedExpense.category,
    createdBy: ctx.userId,
  });
}

async function handleGet(req: NextRequest, ctx: AuthContext) {
  const { searchParams } = new URL(req.url);
  const farmId = ctx.farmId;

  if (searchParams.get("recent") === "true") return handleRecent(farmId);
  if (searchParams.get("info") === "true") return handleInfo(farmId);
  if (searchParams.get("report") === "true") return handleReportMode(farmId, searchParams);

  const month = searchParams.get("month");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  if (month || (startDateParam && endDateParam)) {
    return handleMonthly(farmId, month, startDateParam, endDateParam);
  }

  return handleList(farmId, searchParams);
}

async function handlePost(req: NextRequest, ctx: AuthContext) {
  const writeError = requireWrite(ctx);
  if (writeError) return writeError;

  try {
    const body = await req.json();
    const data = dailyRecordSchema.parse(body);

    if (data.recordId) {
      const existing = await db.query.dailyRecords.findFirst({
        where: and(eq(dailyRecords.id, data.recordId), eq(dailyRecords.farmId, ctx.farmId)),
      });

      if (!existing) {
        return NextResponse.json({ error: "Saisie introuvable" }, { status: 404 });
      }

      const duplicateForDate = await db.query.dailyRecords.findFirst({
        where: and(
          eq(dailyRecords.farmId, ctx.farmId),
          eq(dailyRecords.buildingId, data.buildingId),
          eq(dailyRecords.recordDate, data.recordDate),
          ne(dailyRecords.id, data.recordId)
        ),
      });

      if (duplicateForDate) {
        return NextResponse.json(
          { error: "Une autre saisie existe deja pour cette date et ce batiment" },
          { status: 409 }
        );
      }

      await db
        .update(dailyRecords)
        .set({
          cycleId: data.cycleId,
          buildingId: data.buildingId,
          recordDate: data.recordDate,
          eggsCollected: data.eggsCollected,
          eggsBroken: data.eggsBroken,
          mortalityCount: data.mortalityCount,
          mortalityCause: data.mortalityCause,
          feedQuantityKg: data.feedQuantityKg?.toString(),
          feedType: data.feedType,
          feedCost: data.feedCost?.toString(),
          updatedAt: new Date(),
        })
        .where(eq(dailyRecords.id, data.recordId));

      await syncLinkedExpense(ctx, data.recordId, {
        cycleId: data.cycleId,
        buildingId: data.buildingId,
        recordDate: data.recordDate,
        linkedExpense: data.linkedExpense,
      });

      return NextResponse.json({ success: true, id: data.recordId, updated: true });
    }

    const existing = await db.query.dailyRecords.findFirst({
      where: and(
        eq(dailyRecords.farmId, ctx.farmId),
        eq(dailyRecords.buildingId, data.buildingId),
        eq(dailyRecords.recordDate, data.recordDate)
      ),
    });

    if (existing) {
      await db
        .update(dailyRecords)
        .set({
          cycleId: data.cycleId,
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

      await syncLinkedExpense(ctx, existing.id, {
        cycleId: data.cycleId,
        buildingId: data.buildingId,
        recordDate: data.recordDate,
        linkedExpense: data.linkedExpense,
      });

      return NextResponse.json({ success: true, id: existing.id, updated: true });
    }

    const inserted = await db
      .insert(dailyRecords)
      .values({
        farmId: ctx.farmId,
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
        createdBy: ctx.userId,
      })
      .returning();

    await syncLinkedExpense(ctx, inserted[0].id, {
      cycleId: data.cycleId,
      buildingId: data.buildingId,
      recordDate: data.recordDate,
      linkedExpense: data.linkedExpense,
    });

    return NextResponse.json({ success: true, id: inserted[0].id, updated: false });
  } catch (error) {
    return handleApiError(error, "saisie journalière");
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
