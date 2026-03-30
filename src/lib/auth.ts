import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Nom d'utilisateur requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

// Utilisateurs de fallback (dev / avant connexion DB)
const FALLBACK_USERS = [
  {
    id: "1",
    username: "admin",
    passwordHash: "$2a$10$ZrsGyzR.JbTMLcBdAq8nnuWq.jYDWNoxgiYUJFarYrYEHYN.bCdxm",
    role: "admin",
  },
  {
    id: "2",
    username: "gestion",
    passwordHash: "$2a$10$ileobExm/v.46vEEr9vP7.mJEXilnpAZuGOoMVC/k4bQaHl5WE/r2",
    role: "gestionnaire",
  },
  {
    id: "3",
    username: "demo",
    passwordHash: "$2a$10$BsQ.vzJ1Wq.s9.HiJBeKmOWaM2vA29SkmvtOBWgsZ5HpGj03g7B/u",
    role: "demo",
  },
];

async function findUser(username: string) {
  // Essayer la base de données d'abord
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && !dbUrl.includes("user:password@host")) {
    try {
      const { db } = await import("@/db");
      const { users } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      const user = await db.query.users.findFirst({
        where: eq(users.username, username),
      });
      if (user) return user;
    } catch {
      // DB non dispo → fallback
    }
  }
  // Fallback utilisateurs codés en dur
  return FALLBACK_USERS.find((u) => u.username === username) ?? null;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Nom d'utilisateur", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;
        const user = await findUser(username);
        if (!user) return null;

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) return null;

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
