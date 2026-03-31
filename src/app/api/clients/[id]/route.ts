import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { canWrite } from "@/lib/utils";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  city: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canWrite(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id: rawId } = await context.params;
  const id = parseInt(rawId);
  if (isNaN(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  await db.update(clients).set(parsed.data).where(eq(clients.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canWrite(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id: rawId } = await context.params;
  const id = parseInt(rawId);
  if (isNaN(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  await db.delete(clients).where(eq(clients.id, id));
  return NextResponse.json({ success: true });
}
