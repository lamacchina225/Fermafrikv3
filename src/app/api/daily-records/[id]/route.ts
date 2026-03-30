import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { dailyRecords, expenses } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { canWrite } from "@/lib/utils";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || !canWrite(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  // Fetch the record first to get date/cycle/building for expense cascade
  const record = await db.query.dailyRecords.findFirst({
    where: eq(dailyRecords.id, id),
  });

  if (!record) {
    return NextResponse.json({ error: "Saisie introuvable" }, { status: 404 });
  }

  // Delete linked expenses for the same date/cycle/building
  await db.delete(expenses).where(
    and(
      eq(expenses.cycleId, record.cycleId),
      eq(expenses.buildingId, record.buildingId),
      eq(expenses.expenseDate, record.recordDate)
    )
  );

  await db.delete(dailyRecords).where(eq(dailyRecords.id, id));

  return NextResponse.json({ success: true });
}
