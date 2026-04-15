import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { healthRecords } from "@/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { withAuth, requireWrite, type AuthContext } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";

const healthSchema = z.object({
  buildingId: z.number(),
  cycleId: z.number(),
  recordDate: z.string().max(10),
  type: z.enum(["vaccination", "medication"]),
  productName: z.string().min(1).max(200),
  dose: z.string().max(100).optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

async function handleGet(req: NextRequest, ctx: AuthContext) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const limit = Math.min(Math.max(parseInt(limitParam ?? "100", 10) || 100, 1), 500);
  const offset = Math.max(parseInt(offsetParam ?? "0", 10) || 0, 0);

  const farmFilter = eq(healthRecords.farmId, ctx.farmId);

  const [records, totalCount] = await Promise.all([
    db.query.healthRecords.findMany({
      where: farmFilter,
      orderBy: [desc(healthRecords.recordDate)],
      limit,
      offset,
    }),
    db.select({ count: sql<number>`COUNT(*)` }).from(healthRecords).where(farmFilter),
  ]);

  return NextResponse.json({
    records,
    pagination: { limit, offset, total: Number(totalCount[0]?.count ?? 0) },
  });
}

async function handlePost(req: NextRequest, ctx: AuthContext) {
  const writeError = requireWrite(ctx);
  if (writeError) return writeError;

  try {
    const body = await req.json();
    const data = healthSchema.parse(body);

    const inserted = await db
      .insert(healthRecords)
      .values({
        farmId: ctx.farmId,
        cycleId: data.cycleId,
        buildingId: data.buildingId,
        recordDate: data.recordDate,
        type: data.type,
        productName: data.productName,
        dose: data.dose,
        cost: data.cost?.toString(),
        notes: data.notes,
        createdBy: ctx.userId,
      })
      .returning();

    return NextResponse.json({ success: true, record: inserted[0] });
  } catch (error) {
    return handleApiError(error, "santé");
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
