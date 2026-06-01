import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyRecords, expenses } from "@/db/schema";
import { eq, and, like, ne } from "drizzle-orm";
import { z } from "zod";
import { withAuth, requireWrite, type AuthContext } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { AUTO_FEED_EXPENSE_LABEL } from "@/lib/utils";
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

type ExpenseSyncDb = Pick<typeof db, "query" | "insert" | "update" | "delete">;
type FeedExpenseTarget = {
  cycleId: number;
  buildingId: number;
  recordDate: string;
};

async function findFeedExpense(tx: ExpenseSyncDb, ctx: AuthContext, target: FeedExpenseTarget) {
  return tx.query.expenses.findFirst({
    where: and(
      eq(expenses.farmId, ctx.farmId),
      eq(expenses.cycleId, target.cycleId),
      eq(expenses.buildingId, target.buildingId),
      eq(expenses.expenseDate, target.recordDate),
      eq(expenses.category, "alimentation"),
      eq(expenses.label, AUTO_FEED_EXPENSE_LABEL)
    ),
  });
}

async function syncFeedExpense(
  tx: ExpenseSyncDb,
  ctx: AuthContext,
  data: z.infer<typeof dailyRecordSchema>,
  previousTarget?: FeedExpenseTarget
) {
  const currentTarget = {
    cycleId: data.cycleId,
    buildingId: data.buildingId,
    recordDate: data.recordDate,
  };

  let existingExpense = await findFeedExpense(tx, ctx, currentTarget);
  if (
    !existingExpense &&
    previousTarget &&
    (
      previousTarget.cycleId !== currentTarget.cycleId ||
      previousTarget.buildingId !== currentTarget.buildingId ||
      previousTarget.recordDate !== currentTarget.recordDate
    )
  ) {
    existingExpense = await findFeedExpense(tx, ctx, previousTarget);
  }

  const feedCost = Number(data.feedCost ?? 0);
  if (feedCost <= 0) {
    if (existingExpense) {
      await tx.delete(expenses).where(eq(expenses.id, existingExpense.id));
    }
    return;
  }

  const expensePayload = {
    farmId: ctx.farmId,
    cycleId: currentTarget.cycleId,
    buildingId: currentTarget.buildingId,
    expenseDate: currentTarget.recordDate,
    label: AUTO_FEED_EXPENSE_LABEL,
    amount: feedCost.toString(),
    category: "alimentation" as const,
    createdBy: ctx.userId,
  };

  if (existingExpense) {
    await tx
      .update(expenses)
      .set(expensePayload)
      .where(eq(expenses.id, existingExpense.id));
    return;
  }

  await tx.insert(expenses).values(expensePayload);
}

async function syncLinkedExpense(
  tx: ExpenseSyncDb,
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
  const existingExpense = await tx.query.expenses.findFirst({
    where: and(
      eq(expenses.farmId, ctx.farmId),
      like(expenses.label, getDailyRecordExpenseLikePattern(recordId))
    ),
  });

  if (!payload.linkedExpense) {
    if (existingExpense) {
      await tx.delete(expenses).where(eq(expenses.id, existingExpense.id));
    }
    return;
  }

  const label = buildDailyRecordExpenseLabel(recordId, payload.linkedExpense.label);
  const expensePayload = {
    farmId: ctx.farmId,
    cycleId: payload.cycleId,
    buildingId: payload.buildingId,
    expenseDate: payload.recordDate,
    label,
    amount: payload.linkedExpense.amount.toString(),
    category: payload.linkedExpense.category,
    createdBy: ctx.userId,
  };

  if (existingExpense) {
    await tx
      .update(expenses)
      .set(expensePayload)
      .where(eq(expenses.id, existingExpense.id));
    return;
  }

  await tx.insert(expenses).values(expensePayload);
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

    const result = await db.transaction(async (tx) => {
      if (data.recordId) {
        const existing = await tx.query.dailyRecords.findFirst({
          where: and(eq(dailyRecords.id, data.recordId), eq(dailyRecords.farmId, ctx.farmId)),
        });

        if (!existing) {
          return { error: "Saisie introuvable", status: 404 } as const;
        }

        const duplicateForDate = await tx.query.dailyRecords.findFirst({
          where: and(
            eq(dailyRecords.farmId, ctx.farmId),
            eq(dailyRecords.buildingId, data.buildingId),
            eq(dailyRecords.recordDate, data.recordDate),
            ne(dailyRecords.id, data.recordId)
          ),
        });

        if (duplicateForDate) {
          return {
            error: "Une autre saisie existe deja pour cette date et ce batiment",
            status: 409,
          } as const;
        }

        await tx
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

        await syncFeedExpense(tx, ctx, data, {
          cycleId: existing.cycleId,
          buildingId: existing.buildingId,
          recordDate: existing.recordDate,
        });
        await syncLinkedExpense(tx, ctx, data.recordId, {
          cycleId: data.cycleId,
          buildingId: data.buildingId,
          recordDate: data.recordDate,
          linkedExpense: data.linkedExpense,
        });

        return { success: true, id: data.recordId, updated: true } as const;
      }

      const existing = await tx.query.dailyRecords.findFirst({
        where: and(
          eq(dailyRecords.farmId, ctx.farmId),
          eq(dailyRecords.buildingId, data.buildingId),
          eq(dailyRecords.recordDate, data.recordDate)
        ),
      });

      if (existing) {
        return {
          error: "Une saisie existe deja pour cette date. Modifiez la saisie existante au lieu d'en creer une nouvelle.",
          status: 409,
          existingRecord: existing,
        } as const;
      }

      const inserted = await tx
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

      await syncFeedExpense(tx, ctx, data);
      await syncLinkedExpense(tx, ctx, inserted[0].id, {
        cycleId: data.cycleId,
        buildingId: data.buildingId,
        recordDate: data.recordDate,
        linkedExpense: data.linkedExpense,
      });
      return { success: true, id: inserted[0].id, updated: false } as const;
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error, existingRecord: "existingRecord" in result ? result.existingRecord : undefined },
        { status: result.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "saisie journalière");
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
