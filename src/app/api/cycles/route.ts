import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cycles, buildings } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { withAuth, requireWrite, type AuthContext } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { isAdmin } from "@/lib/utils";

const cycleSchema = z.object({
  buildingId: z.number(),
  startDate: z.string().max(10),
  phase: z.enum(["demarrage", "croissance", "production"]).default("demarrage"),
  initialCount: z.number().min(1, "L'effectif initial est requis"),
  notes: z.string().max(500).optional(),
});

const updateSchema = z.object({
  phase: z.enum(["demarrage", "croissance", "production"]).optional(),
  endDate: z.string().max(10).optional().nullable(),
  notes: z.string().max(500).optional(),
});

async function handleGet(_req: NextRequest, ctx: AuthContext) {
  const allCycles = await db
    .select({
      id: cycles.id,
      buildingId: cycles.buildingId,
      startDate: cycles.startDate,
      endDate: cycles.endDate,
      phase: cycles.phase,
      initialCount: cycles.initialCount,
      notes: cycles.notes,
      buildingName: buildings.name,
    })
    .from(cycles)
    .leftJoin(buildings, eq(cycles.buildingId, buildings.id))
    .where(eq(cycles.farmId, ctx.farmId))
    .orderBy(desc(cycles.startDate));

  return NextResponse.json({ cycles: allCycles });
}

async function handlePost(req: NextRequest, ctx: AuthContext) {
  if (!isAdmin(ctx.session.user.role)) {
    return NextResponse.json({ error: "Droits administrateur requis" }, { status: 403 });
  }

  const writeError = requireWrite(ctx);
  if (writeError) return writeError;

  try {
    const body = await req.json();
    const data = cycleSchema.parse(body);

    // Vérifier que le bâtiment appartient à la ferme
    const building = await db.query.buildings.findFirst({
      where: and(eq(buildings.id, data.buildingId), eq(buildings.farmId, ctx.farmId)),
    });
    if (!building) {
      return NextResponse.json({ error: "Bâtiment introuvable" }, { status: 404 });
    }

    const inserted = await db
      .insert(cycles)
      .values({
        farmId: ctx.farmId,
        buildingId: data.buildingId,
        startDate: data.startDate,
        phase: data.phase,
        initialCount: data.initialCount,
        notes: data.notes,
      })
      .returning();

    return NextResponse.json({ success: true, cycle: inserted[0] }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "cycle");
  }
}

async function handlePatch(req: NextRequest, ctx: AuthContext) {
  if (!isAdmin(ctx.session.user.role)) {
    return NextResponse.json({ error: "Droits administrateur requis" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const cycleId = parseInt(searchParams.get("id") ?? "");
    if (isNaN(cycleId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    // Vérifier ownership
    const existing = await db.query.cycles.findFirst({
      where: and(eq(cycles.id, cycleId), eq(cycles.farmId, ctx.farmId)),
    });
    if (!existing) {
      return NextResponse.json({ error: "Cycle introuvable" }, { status: 404 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    await db
      .update(cycles)
      .set({
        ...(data.phase !== undefined && { phase: data.phase }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
        ...(data.notes !== undefined && { notes: data.notes }),
      })
      .where(eq(cycles.id, cycleId));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "cycle update");
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
export const PATCH = withAuth(handlePatch);
