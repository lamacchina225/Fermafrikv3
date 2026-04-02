import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { feedStock, dailyRecords, sales, buildings, cycles } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { canWrite } from "@/lib/utils";

const feedStockSchema = z.object({
  buildingId: z.number(),
  movementDate: z.string().max(10),
  movementType: z.enum(["in", "out"]),
  quantityKg: z.number().min(0.1),
  unitCost: z.number().min(0).optional(),
  totalCost: z.number().min(0).optional(),
  feedType: z.enum(["demarrage", "croissance", "ponte"]),
  notes: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const summary = searchParams.get("summary");

  if (summary === "true") {
    // Résumé stock oeufs
    const building = await db.query.buildings.findFirst({
      where: eq(buildings.status, "active"),
    });
    if (!building) return NextResponse.json({});

    const cycle = await db.query.cycles.findFirst({
      where: eq(cycles.buildingId, building.id),
    });
    if (!cycle) return NextResponse.json({});

    const eggsAgg = await db
      .select({
        totalEggs: sql<number>`COALESCE(SUM(${dailyRecords.eggsCollected}), 0)`,
        totalBroken: sql<number>`COALESCE(SUM(${dailyRecords.eggsBroken}), 0)`,
      })
      .from(dailyRecords)
      .where(eq(dailyRecords.cycleId, cycle.id));

    const salesAgg = await db
      .select({
        totalTrays: sql<number>`COALESCE(SUM(${sales.traysSold}), 0)`,
      })
      .from(sales)
      .where(eq(sales.cycleId, cycle.id));

    const totalEggs = Number(eggsAgg[0]?.totalEggs ?? 0);
    const totalBroken = Number(eggsAgg[0]?.totalBroken ?? 0);
    const totalTrays = Number(salesAgg[0]?.totalTrays ?? 0);
    const totalSoldEggs = totalTrays * 30;
    const stockOeufs = Math.max(0, totalEggs - totalBroken - totalSoldEggs);

    return NextResponse.json({
      totalEggs,
      totalBroken,
      totalSoldEggs,
      stockOeufs,
      stockPlaquettes: Math.floor(stockOeufs / 30),
    });
  }

  // Liste mouvements stock aliments
  const entries = await db.query.feedStock.findMany({
    orderBy: [desc(feedStock.movementDate)],
  });

  return NextResponse.json({ entries });
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
    const data = feedStockSchema.parse(body);
    const userId = parseInt(session.user.id);

    const [{ id: entryId }] = await db
      .insert(feedStock)
      .values({
        buildingId: data.buildingId,
        movementDate: data.movementDate,
        movementType: data.movementType,
        quantityKg: data.quantityKg.toString(),
        unitCost: data.unitCost?.toString(),
        totalCost: data.totalCost?.toString(),
        feedType: data.feedType,
        notes: data.notes,
        createdBy: isNaN(userId) ? null : userId,
      })
      .$returningId();
    const [inserted] = await db.select().from(feedStock).where(eq(feedStock.id, entryId)).limit(1);

    return NextResponse.json({ success: true, entry: inserted });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("Erreur stock:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
