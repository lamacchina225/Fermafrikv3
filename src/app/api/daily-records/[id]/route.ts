import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyRecords, expenses } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { withAuth, requireWrite, type AuthContext } from "@/lib/api-auth";
import { AUTO_FEED_EXPENSE_LABEL } from "@/lib/utils";

async function handleDelete(_req: NextRequest, ctx: AuthContext, params?: Record<string, string>) {
  const writeError = requireWrite(ctx);
  if (writeError) return writeError;

  const id = parseInt(params?.id ?? "");
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  const record = await db.query.dailyRecords.findFirst({
    where: and(eq(dailyRecords.id, id), eq(dailyRecords.farmId, ctx.farmId)),
  });

  if (!record) {
    return NextResponse.json({ error: "Saisie introuvable" }, { status: 404 });
  }

  // Supprimer uniquement la dépense automatique d'alimentation liée à cette saisie.
  await db.delete(expenses).where(
    and(
      eq(expenses.farmId, ctx.farmId),
      eq(expenses.cycleId, record.cycleId),
      eq(expenses.buildingId, record.buildingId),
      eq(expenses.expenseDate, record.recordDate),
      eq(expenses.category, "alimentation"),
      eq(expenses.label, AUTO_FEED_EXPENSE_LABEL)
    )
  );

  await db.delete(dailyRecords).where(eq(dailyRecords.id, id));

  return NextResponse.json({ success: true });
}

export const DELETE = withAuth(handleDelete);
