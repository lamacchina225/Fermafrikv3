import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { withAuth, requireWrite, type AuthContext } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";

const expenseSchema = z.object({
  buildingId: z.number(),
  cycleId: z.number(),
  expenseDate: z.string().max(10),
  label: z.string().min(1).max(200),
  amount: z.number().min(0),
  category: z.enum(["alimentation", "sante", "energie", "main_oeuvre", "equipement", "autre"]),
});

async function handleGet(req: NextRequest, ctx: AuthContext) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  const farmFilter = eq(expenses.farmId, ctx.farmId);

  const allExpenses = await db.query.expenses.findMany({
    where: date ? and(farmFilter, eq(expenses.expenseDate, date)) : farmFilter,
    orderBy: [desc(expenses.expenseDate), desc(expenses.createdAt)],
  });

  return NextResponse.json({ expenses: allExpenses });
}

async function handlePost(req: NextRequest, ctx: AuthContext) {
  const writeError = requireWrite(ctx);
  if (writeError) return writeError;

  try {
    const body = await req.json();
    const data = expenseSchema.parse(body);

    const inserted = await db
      .insert(expenses)
      .values({
        farmId: ctx.farmId,
        cycleId: data.cycleId,
        buildingId: data.buildingId,
        expenseDate: data.expenseDate,
        label: data.label,
        amount: data.amount.toString(),
        category: data.category,
        createdBy: ctx.userId,
      })
      .returning();

    return NextResponse.json({ success: true, expense: inserted[0] });
  } catch (error) {
    return handleApiError(error, "dépense");
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
