import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, PATCH } from "@/app/api/cycles/route";
import { auth } from "@/lib/auth";
import { db } from "@/db";

const mockAuth = auth as unknown as Mock;
const mockDb = vi.mocked(db);
const ctx = { params: Promise.resolve({}) };

function makePostRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/cycles", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cycles", { method: "GET" });
}

function makePatchRequest(body: object, id: number): NextRequest {
  return new NextRequest(`http://localhost/api/cycles?id=${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validCycle = {
  buildingId: 1,
  startDate: "2026-01-15",
  phase: "demarrage",
  initialCount: 5000,
  notes: "Nouveau lot",
};

describe("GET /api/cycles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeGetRequest(), ctx);
    expect(res.status).toBe(401);
  });

  it("retourne 403 si pas de farmId", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: null },
    } as never);
    const res = await GET(makeGetRequest(), ctx);
    expect(res.status).toBe(403);
  });
});

describe("POST /api/cycles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makePostRequest(validCycle), ctx);
    expect(res.status).toBe(401);
  });

  it("retourne 403 pour un gestionnaire (admin requis)", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "2", role: "gestionnaire", name: "gest", farmId: "1" },
    } as never);
    const res = await POST(makePostRequest(validCycle), ctx);
    expect(res.status).toBe(403);
  });

  it("retourne 403 pour le rôle demo", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "3", role: "demo", name: "demo", farmId: "1" },
    } as never);
    const res = await POST(makePostRequest(validCycle), ctx);
    expect(res.status).toBe(403);
  });

  it("retourne 400 si initialCount < 1", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    const res = await POST(makePostRequest({ ...validCycle, initialCount: 0 }), ctx);
    expect(res.status).toBe(400);
  });

  it("retourne 400 si phase invalide", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    const res = await POST(makePostRequest({ ...validCycle, phase: "invalid" }), ctx);
    expect(res.status).toBe(400);
  });

  it("retourne 400 si startDate dépasse 10 chars", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    const res = await POST(
      makePostRequest({ ...validCycle, startDate: "2026-01-15T00:00" }),
      ctx
    );
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/cycles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await PATCH(makePatchRequest({ phase: "production" }, 1), ctx);
    expect(res.status).toBe(401);
  });

  it("retourne 403 pour un gestionnaire", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "2", role: "gestionnaire", name: "gest", farmId: "1" },
    } as never);
    const res = await PATCH(makePatchRequest({ phase: "production" }, 1), ctx);
    expect(res.status).toBe(403);
  });

  it("retourne 404 si cycle introuvable", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    (mockDb.query.cycles.findFirst as Mock).mockResolvedValueOnce(null);
    const res = await PATCH(makePatchRequest({ phase: "production" }, 999), ctx);
    expect(res.status).toBe(404);
  });
});
