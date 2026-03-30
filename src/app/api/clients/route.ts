import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allClients = await db.select().from(clients).orderBy(clients.name);
    return NextResponse.json({ clients: allClients });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, city, phone } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Le nom du client est requis" },
        { status: 400 }
      );
    }

    const [newClient] = await db
      .insert(clients)
      .values({
        name: name.trim(),
        city: city?.trim() || null,
        phone: phone?.trim() || null,
      })
      .returning();

    return NextResponse.json({ client: newClient }, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du client" },
      { status: 500 }
    );
  }
}
