import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET est requis"),
});

function validateEnv() {
  // Skip validation during Next.js build phase
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return {
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://user:pass@localhost/db?sslmode=require",
      AUTH_SECRET: process.env.AUTH_SECRET || "build-time-secret-placeholder-min-32-chars",
    };
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(
      `\n[env] Variables d'environnement manquantes ou invalides:\n${missing}\n`
    );
    // En développement, laisser passer mais log l'erreur
    if (process.env.NODE_ENV === "production") {
      throw new Error("Variables d'environnement invalides - impossible de démarrer");
    }
  }
  return result.success ? result.data : (process.env as unknown as z.infer<typeof envSchema>);
}

export const env = validateEnv();
