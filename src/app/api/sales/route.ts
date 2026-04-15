import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sales, clients, expenses } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { withAuth, requireWrite, type AuthContext } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";

const linkedExpenseSchema = z.object({
  type: z.enum(["transport", "plateaux", "autre"]),
  amount: z.number().min(1),
  note: z.string().max(500).optional(),
});

const saleSchema = z.object({
  buildingId: z.number(),
  cycleId: z.number(),
  saleDate: z.string().max(10),
  traysSold: z.number().min(1),
  unitPrice: z.number().min(1),
  clientId: z.number().optional().nullable(),
  buyerName: z.string().max(200).optional(),
  linkedExpense: linkedExpenseSchema.optional(),
});

function expenseTypeToCategory(
  type: "transport" | "plateaux" | "autre"
): "autre" | "alimentation" | "sante" | "energie" | "main_oeuvre" | "equipement" {
  if (type === "transport") return "autre";
  if (type === "plateaux") return "equipement";
  return "autre";
}

function expenseTypeToLabel(type: "transport" | "plateaux" | "autre"): string {
  const labels: Record<string, string> = {
    transport: "Transport",
    plateaux: "Achat plateaux/plaquettes",
    autre: "Autre",
  };
  return labels[type] ?? "Autre";
}

async function handleGet(req: NextRequest, ctx: AuthContext) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  const farmFilter = eq(sales.farmId, ctx.farmId);

  if (date) {
    const salesOfDay = await db
      .select({
        id: sales.id,
        cycleId: sales.cycleId,
        buildingId: sales.buildingId,
        saleDate: sales.saleDate,
        traysSold: sales.traysSold,
        unitPrice: sales.unitPrice,
        totalAmount: sales.totalAmount,
        clientId: sales.clientId,
        buyerName: sales.buyerName,
        createdAt: sales.createdAt,
        clientName: clients.name,
        clientCity: clients.city,
        clientPhone: clients.phone,
      })
      .from(sales)
      .leftJoin(clients, eq(sales.clientId, clients.id))
      .where(and(farmFilter, eq(sales.saleDate, date)))
      .orderBy(desc(sales.createdAt));

    return NextResponse.json({ sales: salesOfDay });
  }

  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const limit = Math.min(Math.max(parseInt(limitParam ?? "100", 10) || 100, 1), 500);
  const offset = Math.max(parseInt(offsetParam ?? "0", 10) || 0, 0);

  const allSales = await db
    .select({
      id: sales.id,
      cycleId: sales.cycleId,
      buildingId: sales.buildingId,
      saleDate: sales.saleDate,
      traysSold: sales.traysSold,
      unitPrice: sales.unitPrice,
      totalAmount: sales.totalAmount,
      clientId: sales.clientId,
      buyerName: sales.buyerName,
      createdAt: sales.createdAt,
      clientName: clients.name,
      clientCity: clients.city,
      clientPhone: clients.phone,
    })
    .from(sales)
    .leftJoin(clients, eq(sales.clientId, clients.id))
    .where(farmFilter)
    .orderBy(desc(sales.saleDate))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ sales: allSales });
}

async function handlePost(req: NextRequest, ctx: AuthContext) {
  const writeError = requireWrite(ctx);
  if (writeError) return writeError;

  try {
    const body = await req.json();
    const data = saleSchema.parse(body);

    const totalAmount = data.traysSold * data.unitPrice;

    const inserted = await db
      .insert(sales)
      .values({
        farmId: ctx.farmId,
        cycleId: data.cycleId,
        buildingId: data.buildingId,
        saleDate: data.saleDate,
        traysSold: data.traysSold,
        unitPrice: data.unitPrice.toString(),
        totalAmount: totalAmount.toString(),
        clientId: data.clientId ?? null,
        buyerName: data.buyerName || null,
        createdBy: ctx.userId,
      })
      .returning();

    if (data.linkedExpense) {
      const { type, amount, note } = data.linkedExpense;
      await db.insert(expenses).values({
        farmId: ctx.farmId,
        cycleId: data.cycleId,
        buildingId: data.buildingId,
        expenseDate: data.saleDate,
        label: note
          ? `${expenseTypeToLabel(type)} — ${note}`
          : expenseTypeToLabel(type),
        amount: amount.toString(),
        category: expenseTypeToCategory(type),
        createdBy: ctx.userId,
      });
    }

    return NextResponse.json({ success: true, sale: inserted[0] });
  } catch (error) {
    return handleApiError(error, "vente");
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
