import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedStock, dailyRecords, sales, buildings, cycles } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { z } from "zod";
import { withAuth, requireWrite, type AuthContext } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { EGGS_PER_TRAY } from "@/lib/utils";

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

async function handleGet(req: NextRequest, ctx: AuthContext) {
  const { searchParams } = new URL(req.url);
  const summary = searchParams.get("summary");

  if (summary === "true") {
    const building = await db.query.buildings.findFirst({
      where: and(eq(buildings.farmId, ctx.farmId), eq(buildings.status, "active")),
    });
    if (!building) return NextResponse.json({});

    const cycle = await db.query.cycles.findFirst({
      where: and(eq(cycles.farmId, ctx.farmId), eq(cycles.buildingId, building.id)),
      orderBy: desc(cycles.id),
    });
    if (!cycle) return NextResponse.json({});

    const eggsAgg = await db
      .select({
        totalEggs: sql<number>`COALESCE(SUM(${dailyRecords.eggsCollected}), 0)`,
        totalBroken: sql<number>`COALESCE(SUM(${dailyRecords.eggsBroken}), 0)`,
      })
      .from(dailyRecords)
      .where(and(eq(dailyRecords.farmId, ctx.farmId), eq(dailyRecords.cycleId, cycle.id)));

    const salesAgg = await db
      .select({
        totalTrays: sql<number>`COALESCE(SUM(${sales.traysSold}), 0)`,
      })
      .from(sales)
      .where(and(eq(sales.farmId, ctx.farmId), eq(sales.cycleId, cycle.id)));

    const totalEggs = Number(eggsAgg[0]?.totalEggs ?? 0);
    const totalBroken = Number(eggsAgg[0]?.totalBroken ?? 0);
    const totalTrays = Number(salesAgg[0]?.totalTrays ?? 0);
    const totalSoldEggs = totalTrays * EGGS_PER_TRAY;
    const stockOeufs = Math.max(0, totalEggs - totalBroken - totalSoldEggs);

    return NextResponse.json({
      totalEggs,
      totalBroken,
      totalSoldEggs,
      stockOeufs,
      stockPlaquettes: Math.floor(stockOeufs / EGGS_PER_TRAY),
    });
  }

  const entries = await db.query.feedStock.findMany({
    where: eq(feedStock.farmId, ctx.farmId),
    orderBy: [desc(feedStock.movementDate)],
  });

  return NextResponse.json({ entries });
}

async function handlePost(req: NextRequest, ctx: AuthContext) {
  const writeError = requireWrite(ctx);
  if (writeError) return writeError;

  try {
    const body = await req.json();
    const data = feedStockSchema.parse(body);

    const inserted = await db
      .insert(feedStock)
      .values({
        farmId: ctx.farmId,
        buildingId: data.buildingId,
        movementDate: data.movementDate,
        movementType: data.movementType,
        quantityKg: data.quantityKg.toString(),
        unitCost: data.unitCost?.toString(),
        totalCost: data.totalCost?.toString(),
        feedType: data.feedType,
        notes: data.notes,
        createdBy: ctx.userId,
      })
      .returning();

    return NextResponse.json({ success: true, entry: inserted[0] });
  } catch (error) {
    return handleApiError(error, "stock");
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
