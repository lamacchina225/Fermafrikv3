import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { withAuth, requireWrite, type AuthContext } from "@/lib/api-auth";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  city: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
});

async function handlePatch(req: NextRequest, ctx: AuthContext, params?: Record<string, string>) {
  const writeError = requireWrite(ctx);
  if (writeError) return writeError;

  const id = parseInt(params?.id ?? "");
  if (isNaN(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  // Vérifier ownership
  const existing = await db.query.clients.findFirst({
    where: and(eq(clients.id, id), eq(clients.farmId, ctx.farmId)),
  });
  if (!existing) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });

  await db.update(clients).set(parsed.data).where(eq(clients.id, id));
  return NextResponse.json({ success: true });
}

async function handleDelete(_req: NextRequest, ctx: AuthContext, params?: Record<string, string>) {
  const writeError = requireWrite(ctx);
  if (writeError) return writeError;

  const id = parseInt(params?.id ?? "");
  if (isNaN(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  // Vérifier ownership
  const existing = await db.query.clients.findFirst({
    where: and(eq(clients.id, id), eq(clients.farmId, ctx.farmId)),
  });
  if (!existing) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });

  await db.delete(clients).where(eq(clients.id, id));
  return NextResponse.json({ success: true });
}

export const PATCH = withAuth(handlePatch);
export const DELETE = withAuth(handleDelete);
