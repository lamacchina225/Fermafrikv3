import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/db";
import { farms, users, settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { registerLimiter } from "@/lib/rate-limit";
import { handleApiError } from "@/lib/api-error";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIRES_UPPERCASE,
  PASSWORD_REQUIRES_LOWERCASE,
  PASSWORD_REQUIRES_NUMBER,
  PASSWORD_REQUIRES_SPECIAL,
} from "@/lib/constants";

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Minimum 3 caractères")
    .max(50, "Maximum 50 caractères")
    .regex(/^[a-zA-Z0-9_]+$/, "Lettres, chiffres et _ uniquement"),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Minimum ${PASSWORD_MIN_LENGTH} caractères`)
    .regex(PASSWORD_REQUIRES_UPPERCASE, "Au moins une majuscule (A-Z)")
    .regex(PASSWORD_REQUIRES_LOWERCASE, "Au moins une minuscule (a-z)")
    .regex(PASSWORD_REQUIRES_NUMBER, "Au moins un chiffre (0-9)")
    .regex(PASSWORD_REQUIRES_SPECIAL, "Au moins un caractère spécial (!@#$%^&*...)"),
  farmName: z.string().min(1, "Le nom de la ferme est requis").max(200),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limiting par IP
    const ip =
      req.headers.get("x-forwarded-for") ??
      req.headers.get("x-real-ip") ??
      "unknown";

    if (!(await registerLimiter.check(ip))) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans 30 minutes." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const data = registerSchema.parse(body);

    // Vérifier que le nom d'utilisateur n'existe pas déjà
    const existing = await db.query.users.findFirst({
      where: eq(users.username, data.username),
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ce nom d'utilisateur est déjà pris" },
        { status: 409 }
      );
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Créer la ferme
    const [farm] = await db
      .insert(farms)
      .values({ name: data.farmName })
      .returning();

    // Créer l'utilisateur admin de la ferme
    const [user] = await db
      .insert(users)
      .values({
        username: data.username,
        email: data.email || null,
        passwordHash,
        role: "admin",
        farmId: farm.id,
      })
      .returning();

    // Mettre à jour le owner de la ferme
    await db
      .update(farms)
      .set({ ownerId: user.id })
      .where(eq(farms.id, farm.id));

    // Créer les paramètres par défaut
    await db.insert(settings).values([
      { farmId: farm.id, key: "prix_plaquette", value: "7000", updatedBy: user.id },
      { farmId: farm.id, key: "nom_ferme", value: data.farmName, updatedBy: user.id },
      { farmId: farm.id, key: "devise", value: "XOF", updatedBy: user.id },
    ]);

    return NextResponse.json(
      { success: true, farmId: farm.id, userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "inscription");
  }
}
