import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings, buildings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { withAuth, type AuthContext } from "@/lib/api-auth";
import { isAdmin } from "@/lib/utils";

const settingsSchema = z.object({
  prix_plaquette: z.number().min(1).optional(),
  nom_ferme: z.string().min(1).max(200).optional(),
  devise: z.string().max(10).optional(),
});

const buildingSchema = z.object({
  name: z.string().min(1).max(100),
  capacity: z.number().min(1),
  status: z.enum(["active", "inactive", "construction"]).optional(),
});

async function handleGet(req: NextRequest, ctx: AuthContext) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "buildings") {
    const allBuildings = await db.query.buildings.findMany({
      where: eq(buildings.farmId, ctx.farmId),
      orderBy: [buildings.name],
    });
    return NextResponse.json(
      { buildings: allBuildings },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=30" } }
    );
  }

  const allSettings = await db.query.settings.findMany({
    where: eq(settings.farmId, ctx.farmId),
  });
  const settingsMap: Record<string, string> = {};
  allSettings.forEach((s) => {
    settingsMap[s.key] = s.value;
  });

  return NextResponse.json(settingsMap, {
    headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=60" },
  });
}

async function handlePost(req: NextRequest, ctx: AuthContext) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  // Ajout de bâtiment (admin requis)
  if (type === "buildings") {
    if (!isAdmin(ctx.session.user.role)) {
      return NextResponse.json({ error: "Droits administrateur requis" }, { status: 403 });
    }
    try {
      const body = await req.json();
      const data = buildingSchema.parse(body);

      const inserted = await db
        .insert(buildings)
        .values({
          farmId: ctx.farmId,
          name: data.name,
          capacity: data.capacity,
          status: data.status ?? "active",
        })
        .returning();

      return NextResponse.json({ success: true, building: inserted[0] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Données invalides" }, { status: 400 });
      }
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
  }

  // Modification des paramètres (admin requis)
  if (!isAdmin(ctx.session.user.role)) {
    return NextResponse.json({ error: "Droits administrateur requis" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = settingsSchema.parse(body);

    const updates: Promise<unknown>[] = [];

    if (data.prix_plaquette !== undefined) {
      updates.push(
        db
          .insert(settings)
          .values({
            farmId: ctx.farmId,
            key: "prix_plaquette",
            value: data.prix_plaquette.toString(),
            updatedBy: ctx.userId,
          })
          .onConflictDoUpdate({
            target: [settings.farmId, settings.key],
            set: {
              value: data.prix_plaquette.toString(),
              updatedBy: ctx.userId,
              updatedAt: new Date(),
            },
          })
      );
    }

    if (data.nom_ferme !== undefined) {
      updates.push(
        db
          .insert(settings)
          .values({
            farmId: ctx.farmId,
            key: "nom_ferme",
            value: data.nom_ferme,
            updatedBy: ctx.userId,
          })
          .onConflictDoUpdate({
            target: [settings.farmId, settings.key],
            set: {
              value: data.nom_ferme,
              updatedBy: ctx.userId,
              updatedAt: new Date(),
            },
          })
      );
    }

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("Erreur settings:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
