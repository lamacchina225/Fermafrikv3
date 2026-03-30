import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { sales } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/utils";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!isAdmin(session.user.role)) {
    return NextResponse.json(
      { error: "Seuls les administrateurs peuvent supprimer une vente" },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const saleId = parseInt(id);
  if (isNaN(saleId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  // Vérifier que la vente existe
  const existing = await db.query.sales.findFirst({
    where: eq(sales.id, saleId),
  });

  if (!existing) {
    return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });
  }

  await db.delete(sales).where(eq(sales.id, saleId));

  return NextResponse.json({ success: true });
}
