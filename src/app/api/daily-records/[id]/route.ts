import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyRecords, expenses } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { withAuth, requireWrite, type AuthContext } from "@/lib/api-auth";

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

  // Supprimer les dépenses liées
  await db.delete(expenses).where(
    and(
      eq(expenses.farmId, ctx.farmId),
      eq(expenses.cycleId, record.cycleId),
      eq(expenses.buildingId, record.buildingId),
      eq(expenses.expenseDate, record.recordDate)
    )
  );

  await db.delete(dailyRecords).where(eq(dailyRecords.id, id));

  return NextResponse.json({ success: true });
}

export const DELETE = withAuth(handleDelete);
