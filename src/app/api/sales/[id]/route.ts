import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sales } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { withAuth, type AuthContext } from "@/lib/api-auth";
import { isAdmin } from "@/lib/utils";

async function handleDelete(_req: NextRequest, ctx: AuthContext, params?: Record<string, string>) {
  if (!isAdmin(ctx.session.user.role)) {
    return NextResponse.json(
      { error: "Seuls les administrateurs peuvent supprimer une vente" },
      { status: 403 }
    );
  }

  const saleId = parseInt(params?.id ?? "");
  if (isNaN(saleId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const existing = await db.query.sales.findFirst({
    where: and(eq(sales.id, saleId), eq(sales.farmId, ctx.farmId)),
  });

  if (!existing) {
    return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });
  }

  await db.delete(sales).where(eq(sales.id, saleId));

  return NextResponse.json({ success: true });
}

export const DELETE = withAuth(handleDelete);
