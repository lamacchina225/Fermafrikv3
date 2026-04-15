import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyRecords } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { withAuth, requireWrite, type AuthContext } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import {
  handleRecent,
  handleMonthly,
  handleInfo,
  handleReportMode,
  handleList,
} from "./handlers";

const dailyRecordSchema = z.object({
  buildingId: z.number(),
  cycleId: z.number(),
  recordDate: z.string().max(10),
  eggsCollected: z.number().min(0).default(0),
  eggsBroken: z.number().min(0).default(0),
  mortalityCount: z.number().min(0).default(0),
  mortalityCause: z.string().max(500).optional(),
  feedQuantityKg: z.number().min(0).optional(),
  feedType: z.enum(["demarrage", "croissance", "ponte"]).optional(),
  feedCost: z.number().min(0).optional(),
});

// ─── GET (routeur simple) ───────────────────────────────────────────────────

async function handleGet(req: NextRequest, ctx: AuthContext) {
  const { searchParams } = new URL(req.url);
  const farmId = ctx.farmId;

  if (searchParams.get("recent") === "true") return handleRecent(farmId);
  if (searchParams.get("info") === "true") return handleInfo(farmId);
  if (searchParams.get("report") === "true") return handleReportMode(farmId, searchParams);

  const month = searchParams.get("month");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  if (month || (startDateParam && endDateParam)) {
    return handleMonthly(farmId, month, startDateParam, endDateParam);
  }

  return handleList(farmId, searchParams);
}

// ─── POST ───────────────────────────────────────────────────────────────────

async function handlePost(req: NextRequest, ctx: AuthContext) {
  const writeError = requireWrite(ctx);
  if (writeError) return writeError;

  try {
    const body = await req.json();
    const data = dailyRecordSchema.parse(body);

    // Upsert : une saisie par bâtiment par jour
    const existing = await db.query.dailyRecords.findFirst({
      where: and(
        eq(dailyRecords.farmId, ctx.farmId),
        eq(dailyRecords.buildingId, data.buildingId),
        eq(dailyRecords.recordDate, data.recordDate)
      ),
    });

    if (existing) {
      await db
        .update(dailyRecords)
        .set({
          eggsCollected: data.eggsCollected,
          eggsBroken: data.eggsBroken,
          mortalityCount: data.mortalityCount,
          mortalityCause: data.mortalityCause,
          feedQuantityKg: data.feedQuantityKg?.toString(),
          feedType: data.feedType,
          feedCost: data.feedCost?.toString(),
          updatedAt: new Date(),
        })
        .where(eq(dailyRecords.id, existing.id));

      return NextResponse.json({ success: true, id: existing.id, updated: true });
    } else {
      const inserted = await db
        .insert(dailyRecords)
        .values({
          farmId: ctx.farmId,
          cycleId: data.cycleId,
          buildingId: data.buildingId,
          recordDate: data.recordDate,
          eggsCollected: data.eggsCollected,
          eggsBroken: data.eggsBroken,
          eggsSold: 0,
          mortalityCount: data.mortalityCount,
          mortalityCause: data.mortalityCause,
          feedQuantityKg: data.feedQuantityKg?.toString(),
          feedType: data.feedType,
          feedCost: data.feedCost?.toString(),
          revenue: "0",
          createdBy: ctx.userId,
        })
        .returning();

      return NextResponse.json({ success: true, id: inserted[0].id, updated: false });
    }
  } catch (error) {
    return handleApiError(error, "saisie journalière");
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
