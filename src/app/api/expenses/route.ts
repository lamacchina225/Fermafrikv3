import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { canWrite } from "@/lib/utils";

const expenseSchema = z.object({
  buildingId: z.number(),
  cycleId: z.number(),
  expenseDate: z.string().max(10),
  label: z.string().min(1).max(200),
  amount: z.number().min(0),
  category: z.enum(["alimentation", "sante", "energie", "main_oeuvre", "equipement", "autre"]),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  const allExpenses = await db.query.expenses.findMany({
    where: date ? eq(expenses.expenseDate, date) : undefined,
    orderBy: [desc(expenses.expenseDate), desc(expenses.createdAt)],
  });

  return NextResponse.json({ expenses: allExpenses });
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
    const data = expenseSchema.parse(body);
    const userId = parseInt(session.user.id);

    const [{ id: expenseId }] = await db
      .insert(expenses)
      .values({
        cycleId: data.cycleId,
        buildingId: data.buildingId,
        expenseDate: data.expenseDate,
        label: data.label,
        amount: data.amount.toString(),
        category: data.category,
        createdBy: isNaN(userId) ? null : userId,
      })
      .$returningId();
    const [inserted] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);

    return NextResponse.json({ success: true, expense: inserted });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("Erreur dépense:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
