import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

type Role = string;

export interface AuthContext {
  session: Session;
  userId: number | null;
  farmId: number;
}

type AuthHandler = (
  req: NextRequest,
  ctx: AuthContext,
  params?: Record<string, string>
) => Promise<NextResponse>;

type NextRouteHandler = (
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wrapper pour protéger les routes API avec authentification + multi-tenant.
 * Vérifie la session, injecte userId et farmId.
 * Refuse l'accès si l'utilisateur n'a pas de ferme associée.
 */
export function withAuth(handler: AuthHandler, requiredRole?: Role): NextRouteHandler {
  const wrapped = async (
    req: NextRequest,
    context?: { params?: Promise<Record<string, string>> | Record<string, string> }
  ) => {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (requiredRole && session.user.role !== requiredRole) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    const rawId = parseInt(session.user.id, 10);
    const userId = isNaN(rawId) ? null : rawId;

    const farmId = session.user.farmId ? parseInt(session.user.farmId, 10) : NaN;
    if (isNaN(farmId)) {
      return NextResponse.json(
        { error: "Aucune ferme associée à votre compte" },
        { status: 403 }
      );
    }

    // Resolve params (Next.js 15 makes params a Promise)
    const resolvedParams = context?.params
      ? (context.params instanceof Promise ? await context.params : context.params)
      : undefined;

    return handler(req, { session, userId, farmId }, resolvedParams);
  };
  return wrapped as NextRouteHandler;
}

/**
 * Vérifie que l'utilisateur a les droits d'écriture (pas demo)
 */
export function requireWrite(ctx: AuthContext): NextResponse | null {
  if (ctx.session.user.role === "demo") {
    return NextResponse.json(
      { error: "Mode démo : lecture seule" },
      { status: 403 }
    );
  }
  return null;
}
