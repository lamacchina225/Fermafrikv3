import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { healthRecords } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { canWrite } from "@/lib/utils";

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

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const records = await db.query.healthRecords.findMany({
    orderBy: [desc(healthRecords.recordDate)],
  });

  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!canWrite(session.user.role)) {
    return NextResponse.json({ error: "Mode démo : lecture seule" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = healthSchema.parse(body);
    const userId = parseInt(session.user.id);

    const [{ id: recordId }] = await db
      .insert(healthRecords)
      .values({
        cycleId: data.cycleId,
        buildingId: data.buildingId,
        recordDate: data.recordDate,
        type: data.type,
        productName: data.productName,
        dose: data.dose,
        cost: data.cost?.toString(),
        notes: data.notes,
        createdBy: isNaN(userId) ? null : userId,
      })
      .$returningId();
    const [inserted] = await db.select().from(healthRecords).where(eq(healthRecords.id, recordId)).limit(1);

    return NextResponse.json({ success: true, record: inserted });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("Erreur santé:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
