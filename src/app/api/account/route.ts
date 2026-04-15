import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { withAuth, type AuthContext } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: z.string().min(6, "Minimum 6 caractères"),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

async function handleGet(_req: NextRequest, ctx: AuthContext) {
  if (!ctx.userId) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const user = await db.query.users.findFirst({
    where: and(eq(users.id, ctx.userId), eq(users.farmId, ctx.farmId)),
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });
}

async function handlePost(req: NextRequest, ctx: AuthContext) {
  if (!ctx.userId) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data = changePasswordSchema.parse(body);

    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const passwordMatch = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Mot de passe actuel incorrect" },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(data.newPassword, 12);
    await db
      .update(users)
      .set({ passwordHash: newHash })
      .where(eq(users.id, ctx.userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "changement mot de passe");
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
