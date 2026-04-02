import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { sales, clients, expenses, buildings, cycles } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { canWrite } from "@/lib/utils";

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

// Mapping type de dépense liée → catégorie DB
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

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (date) {
    // Ventes d'un jour précis
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
      .where(eq(sales.saleDate, date))
      .orderBy(desc(sales.createdAt));

    return NextResponse.json({ sales: salesOfDay });
  }

  // Toutes les ventes (comportement d'origine)
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
    .orderBy(desc(sales.saleDate));

  return NextResponse.json({ sales: allSales });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!canWrite(session.user.role)) {
    return NextResponse.json(
      { error: "Mode démo : lecture seule" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const data = saleSchema.parse(body);

    const totalAmount = data.traysSold * data.unitPrice;
    const userId = parseInt(session.user.id);
    const createdBy = isNaN(userId) ? null : userId;

    // Créer la vente
    const [{ id: saleId }] = await db
      .insert(sales)
      .values({
        cycleId: data.cycleId,
        buildingId: data.buildingId,
        saleDate: data.saleDate,
        traysSold: data.traysSold,
        unitPrice: data.unitPrice.toString(),
        totalAmount: totalAmount.toString(),
        clientId: data.clientId ?? null,
        buyerName: data.buyerName || null,
        createdBy,
      })
      .$returningId();
    const [inserted] = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);

    // Si une dépense liée est fournie, la créer aussi
    if (data.linkedExpense) {
      const { type, amount, note } = data.linkedExpense;
      await db.insert(expenses).values({
        cycleId: data.cycleId,
        buildingId: data.buildingId,
        expenseDate: data.saleDate,
        label: note
          ? `${expenseTypeToLabel(type)} — ${note}`
          : expenseTypeToLabel(type),
        amount: amount.toString(),
        category: expenseTypeToCategory(type),
        createdBy,
      });
    }

    return NextResponse.json({ success: true, sale: inserted });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Erreur vente:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
