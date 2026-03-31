import { describe, it, expect, vi, beforeEach } from "vitest";

// On teste la logique de rate limiting isolément
// en simulant des appels répétés depuis la même IP

describe("Rate limiting login", () => {
  // Reset modules entre chaque test pour repartir d'un état propre
  beforeEach(() => {
    vi.resetModules();
  });

  it("autorise les 5 premières tentatives", async () => {
    const { checkRateLimit } = await import("@/tests/helpers/rate-limit-helper");
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("1.2.3.4")).toBe(true);
    }
  });

  it("bloque la 6ème tentative", async () => {
    const { checkRateLimit } = await import("@/tests/helpers/rate-limit-helper");
    for (let i = 0; i < 5; i++) checkRateLimit("5.6.7.8");
    expect(checkRateLimit("5.6.7.8")).toBe(false);
  });

  it("des IPs différentes ne se bloquent pas mutuellement", async () => {
    const { checkRateLimit } = await import("@/tests/helpers/rate-limit-helper");
    for (let i = 0; i < 5; i++) checkRateLimit("10.0.0.1");
    // IP différente → toujours autorisée
    expect(checkRateLimit("10.0.0.2")).toBe(true);
  });

  it("reset libère l'IP", async () => {
    const { checkRateLimit, resetRateLimit } = await import("@/tests/helpers/rate-limit-helper");
    for (let i = 0; i < 5; i++) checkRateLimit("9.9.9.9");
    resetRateLimit("9.9.9.9");
    expect(checkRateLimit("9.9.9.9")).toBe(true);
  });
});
