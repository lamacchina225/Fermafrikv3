/**
 * Rate limiter en mémoire (Map).
 * NOTE: En serverless, le Map est réinitialisé à chaque cold start.
 * À migrer vers Redis/Upstash pour la production multi-instance.
 */

import {
  LOGIN_RATE_LIMIT_ATTEMPTS,
  LOGIN_RATE_LIMIT_WINDOW_MIN,
  REGISTER_RATE_LIMIT_ATTEMPTS,
  REGISTER_RATE_LIMIT_WINDOW_MIN,
} from "@/lib/constants";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  /** Nombre max de tentatives dans la fenêtre */
  maxAttempts: number;
  /** Durée de la fenêtre en millisecondes */
  windowMs: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private maxAttempts: number;
  private windowMs: number;

  constructor(opts: RateLimiterOptions) {
    this.maxAttempts = opts.maxAttempts;
    this.windowMs = opts.windowMs;
  }

  /** Retourne true si la requête est autorisée, false si le quota est dépassé. */
  check(key: string): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (entry.count >= this.maxAttempts) return false;
    entry.count++;
    return true;
  }

  /** Réinitialise le compteur pour une clé (ex. après login réussi). */
  reset(key: string): void {
    this.store.delete(key);
  }
}

// ── Instances partagées ─────────────────────────────────────────────────────

/** Login : 5 tentatives / 15 min */
export const loginLimiter = new RateLimiter({
  maxAttempts: LOGIN_RATE_LIMIT_ATTEMPTS,
  windowMs: LOGIN_RATE_LIMIT_WINDOW_MIN * 60 * 1000,
});

/** Register : 3 créations de compte / 30 min par IP */
export const registerLimiter = new RateLimiter({
  maxAttempts: REGISTER_RATE_LIMIT_ATTEMPTS,
  windowMs: REGISTER_RATE_LIMIT_WINDOW_MIN * 60 * 1000,
});
