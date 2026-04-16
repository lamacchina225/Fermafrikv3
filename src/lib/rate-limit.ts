/**
 * Rate limiter avec bascule automatique :
 *  - Upstash Redis si UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN présents
 *  - sinon Map en mémoire (dev local / instance unique)
 *
 * Le mode Map NE SURVIT PAS aux cold starts ni à plusieurs instances.
 * En production multi-instance, configurer Upstash.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  LOGIN_RATE_LIMIT_ATTEMPTS,
  LOGIN_RATE_LIMIT_WINDOW_MIN,
  REGISTER_RATE_LIMIT_ATTEMPTS,
  REGISTER_RATE_LIMIT_WINDOW_MIN,
} from "@/lib/constants";
import { env } from "@/lib/env";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  /** Nombre max de tentatives dans la fenêtre */
  maxAttempts: number;
  /** Durée de la fenêtre en millisecondes */
  windowMs: number;
  /** Préfixe de clé pour Upstash (ex: "rl:login") */
  prefix: string;
}

interface Limiter {
  check(key: string): Promise<boolean>;
  reset(key: string): Promise<void>;
}

function getRedis(): Redis | null {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
}

class InMemoryLimiter implements Limiter {
  private store = new Map<string, RateLimitEntry>();
  constructor(private maxAttempts: number, private windowMs: number) {}

  async check(key: string): Promise<boolean> {
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

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}

class UpstashLimiter implements Limiter {
  private limiter: Ratelimit;
  private redis: Redis;
  private prefix: string;

  constructor(redis: Redis, maxAttempts: number, windowMs: number, prefix: string) {
    this.redis = redis;
    this.prefix = prefix;
    this.limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(maxAttempts, `${windowMs} ms`),
      prefix,
      analytics: false,
    });
  }

  async check(key: string): Promise<boolean> {
    const { success } = await this.limiter.limit(key);
    return success;
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(`${this.prefix}:${key}`);
  }
}

export class RateLimiter {
  private impl: Limiter;

  constructor(opts: RateLimiterOptions) {
    const redis = getRedis();
    this.impl = redis
      ? new UpstashLimiter(redis, opts.maxAttempts, opts.windowMs, opts.prefix)
      : new InMemoryLimiter(opts.maxAttempts, opts.windowMs);
  }

  /** Retourne true si la requête est autorisée, false si le quota est dépassé. */
  async check(key: string): Promise<boolean> {
    return this.impl.check(key);
  }

  /** Réinitialise le compteur pour une clé (ex. après login réussi). */
  async reset(key: string): Promise<void> {
    return this.impl.reset(key);
  }
}

// ── Instances partagées ─────────────────────────────────────────────────────

/** Login : 5 tentatives / 15 min */
export const loginLimiter = new RateLimiter({
  maxAttempts: LOGIN_RATE_LIMIT_ATTEMPTS,
  windowMs: LOGIN_RATE_LIMIT_WINDOW_MIN * 60 * 1000,
  prefix: "rl:login",
});

/** Register : 3 créations de compte / 30 min par IP */
export const registerLimiter = new RateLimiter({
  maxAttempts: REGISTER_RATE_LIMIT_ATTEMPTS,
  windowMs: REGISTER_RATE_LIMIT_WINDOW_MIN * 60 * 1000,
  prefix: "rl:register",
});
