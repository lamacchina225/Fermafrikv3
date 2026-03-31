import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Nom d'utilisateur requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

// Rate limiting : max 5 tentatives par IP sur 15 minutes
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

/**
 * Vérifie si une IP est autorisée à tenter une connexion.
 * Bloque après MAX_ATTEMPTS tentatives échouées sur WINDOW_MS ms.
 * @returns true si autorisé, false si bloqué
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

/**
 * Réinitialise le compteur de tentatives pour une IP (après login réussi).
 */
function resetRateLimit(ip: string) {
  loginAttempts.delete(ip);
}

/**
 * Recherche un utilisateur par son nom d'utilisateur en base de données.
 * @returns L'utilisateur ou null s'il n'existe pas
 */
async function findUser(username: string) {
  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });
  return user ?? null;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Nom d'utilisateur", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials, req) {
        const ip =
          (req as Request & { headers?: Headers })?.headers?.get("x-forwarded-for") ??
          (req as Request & { headers?: Headers })?.headers?.get("x-real-ip") ??
          "unknown";

        if (!checkRateLimit(ip)) {
          console.warn(`Rate limit dépassé pour IP: ${ip}`);
          return null;
        }

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;
        const user = await findUser(username);
        if (!user) return null;

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) return null;

        resetRateLimit(ip);

        return {
          id: user.id.toString(),
          name: user.username,
          email: null,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  }
}
