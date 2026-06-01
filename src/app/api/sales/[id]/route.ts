import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clients, sales } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";
import { withAuth, requireWrite, type AuthContext } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { isAdmin } from "@/lib/utils";

const updateSaleSchema = z.object({
  saleDate: z.string().max(10),
  traysSold: z.number().min(1),
  unitPrice: z.number().min(1),
  clientId: z.number().optional().nullable(),
  buyerName: z.string().max(200).optional().nullable(),
});

async function handlePut(req: NextRequest, ctx: AuthContext, params?: Record<string, string>) {
  const writeError = requireWrite(ctx);
  if (writeError) return writeError;

  try {
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

    const body = await req.json();
    const data = updateSaleSchema.parse(body);

    if (data.clientId != null) {
      const client = await db.query.clients.findFirst({
        where: and(eq(clients.id, data.clientId), eq(clients.farmId, ctx.farmId)),
      });
      if (!client) {
        return NextResponse.json({ error: "Client introuvable" }, { status: 400 });
      }
    }

    const duplicateForDate = await db.query.sales.findFirst({
      where: and(
        eq(sales.farmId, ctx.farmId),
        eq(sales.saleDate, data.saleDate),
        ne(sales.id, saleId)
      ),
    });

    if (duplicateForDate) {
      return NextResponse.json(
        {
          error: "Une autre vente existe deja pour cette date. Modifiez la vente existante au lieu de creer un doublon.",
          existingSale: duplicateForDate,
        },
        { status: 409 }
      );
    }

    const totalAmount = data.traysSold * data.unitPrice;
    const updated = await db
      .update(sales)
      .set({
        saleDate: data.saleDate,
        traysSold: data.traysSold,
        unitPrice: data.unitPrice.toString(),
        totalAmount: totalAmount.toString(),
        clientId: data.clientId ?? null,
        buyerName: data.clientId ? null : data.buyerName?.trim() || null,
      })
      .where(and(eq(sales.id, saleId), eq(sales.farmId, ctx.farmId)))
      .returning();

    return NextResponse.json({ success: true, sale: updated[0] });
  } catch (error) {
    return handleApiError(error, "vente");
  }
}

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

export const PUT = withAuth(handlePut);
export const DELETE = withAuth(handleDelete);
