import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { loginLimiter } from "@/lib/rate-limit";
import { authConfig } from "./auth.config";

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
  ...authConfig,
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

        if (!loginLimiter.check(ip)) {
          console.warn(`Rate limit dépassé pour IP: ${ip}`);
          return null;
        }

        const parsed = z
          .object({
            username: z.string().min(1),
            password: z.string().min(1),
          })
          .safeParse(credentials);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;
        const user = await findUser(username);
        if (!user) return null;

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) return null;

        loginLimiter.reset(ip);

        return {
          id: user.id.toString(),
          name: user.username,
          email: null,
          role: user.role,
          farmId: user.farmId?.toString() ?? null,
        };
      },
    }),
  ],
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      farmId: string | null;
    };
  }
}
