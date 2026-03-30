import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { settings, buildings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { isAdmin } from "@/lib/utils";

const settingsSchema = z.object({
  prix_plaquette: z.number().min(1).optional(),
  nom_ferme: z.string().min(1).optional(),
  devise: z.string().optional(),
});

const buildingSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().min(1),
  status: z.enum(["active", "inactive", "construction"]).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "buildings") {
    const allBuildings = await db.query.buildings.findMany({
      orderBy: [buildings.name],
    });
    return NextResponse.json({ buildings: allBuildings });
  }

  // Retourner tous les paramètres comme objet clé-valeur
  const allSettings = await db.query.settings.findMany();
  const settingsMap: Record<string, string> = {};
  allSettings.forEach((s) => {
    settingsMap[s.key] = s.value;
  });

  return NextResponse.json(settingsMap);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const userId = parseInt(session.user.id);

  // Ajout de bâtiment (admin requis)
  if (type === "buildings") {
    if (!isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Droits administrateur requis" }, { status: 403 });
    }
    try {
      const body = await req.json();
      const data = buildingSchema.parse(body);

      const inserted = await db
        .insert(buildings)
        .values({
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
  if (!isAdmin(session.user.role)) {
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
            key: "prix_plaquette",
            value: data.prix_plaquette.toString(),
            updatedBy: isNaN(userId) ? null : userId,
          })
          .onConflictDoUpdate({
            target: settings.key,
            set: {
              value: data.prix_plaquette.toString(),
              updatedBy: isNaN(userId) ? null : userId,
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
            key: "nom_ferme",
            value: data.nom_ferme,
            updatedBy: isNaN(userId) ? null : userId,
          })
          .onConflictDoUpdate({
            target: settings.key,
            set: {
              value: data.nom_ferme,
              updatedBy: isNaN(userId) ? null : userId,
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
