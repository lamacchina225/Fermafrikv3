import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { withAuth, requireWrite, type AuthContext } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";

async function handleGet(_req: NextRequest, ctx: AuthContext) {
  try {
    const allClients = await db
      .select()
      .from(clients)
      .where(eq(clients.farmId, ctx.farmId))
      .orderBy(clients.name);
    return NextResponse.json(
      { clients: allClients },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=30" } }
    );
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des clients" },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  city: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
});

async function handlePost(req: NextRequest, ctx: AuthContext) {
  const writeError = requireWrite(ctx);
  if (writeError) return writeError;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const [newClient] = await db
      .insert(clients)
      .values({
        farmId: ctx.farmId,
        name: data.name.trim(),
        city: data.city?.trim() || null,
        phone: data.phone?.trim() || null,
      })
      .returning();

    return NextResponse.json({ client: newClient }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "client");
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
