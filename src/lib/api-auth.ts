import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type Role = string;

interface AuthContext {
  session: NonNullable<Awaited<ReturnType<typeof auth>>>;
  userId: number | null;
}

type AuthHandler = (
  req: NextRequest,
  ctx: AuthContext,
  params?: Record<string, string>
) => Promise<NextResponse>;

/**
 * Wrapper pour protéger les routes API avec authentification.
 * Vérifie la session et injecte userId parsé.
 * @param handler - La fonction de route à protéger
 * @param requiredRole - Rôle optionnel requis (ex: "admin")
 */
export function withAuth(handler: AuthHandler, requiredRole?: Role) {
  return async (req: NextRequest, context?: { params?: Record<string, string> }) => {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (requiredRole && session.user.role !== requiredRole) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    const rawId = parseInt(session.user.id, 10);
    const userId = isNaN(rawId) ? null : rawId;

    return handler(req, { session, userId }, context?.params);
  };
}
