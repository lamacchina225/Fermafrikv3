import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const allClients = await db.select().from(clients).orderBy(clients.name);
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

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { name, city, phone } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Le nom du client est requis" },
        { status: 400 }
      );
    }

    const [{ id: clientId }] = await db
      .insert(clients)
      .values({
        name: name.trim(),
        city: city?.trim() || null,
        phone: phone?.trim() || null,
      })
      .$returningId();
    const [newClient] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);

    return NextResponse.json({ client: newClient }, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du client" },
      { status: 500 }
    );
  }
}
