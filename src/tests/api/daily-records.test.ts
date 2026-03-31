import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/daily-records/route";
import { auth } from "@/lib/auth";
import { db } from "@/db";

const mockAuth = vi.mocked(auth);
const mockDb = vi.mocked(db);

function makePostRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/daily-records", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validPayload = {
  buildingId: 1,
  cycleId: 1,
  recordDate: "2026-03-31",
  eggsCollected: 250,
  eggsBroken: 5,
  mortalityCount: 0,
};

describe("POST /api/daily-records", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makePostRequest(validPayload));
    expect(res.status).toBe(401);
  });

  it("retourne 403 pour le rôle demo (lecture seule)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "3", role: "demo", name: "demo" } } as never);
    const res = await POST(makePostRequest(validPayload));
    expect(res.status).toBe(403);
  });

  it("retourne 400 si les données sont invalides (oeufs négatifs)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin", name: "admin" } } as never);
    const res = await POST(makePostRequest({ ...validPayload, eggsCollected: -10 }));
    expect(res.status).toBe(400);
  });

  it("retourne 400 si recordDate dépasse 10 chars", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin", name: "admin" } } as never);
    const res = await POST(makePostRequest({ ...validPayload, recordDate: "2026-03-31T00:00:00Z" }));
    expect(res.status).toBe(400);
  });

  it("crée une saisie avec des données valides", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin", name: "admin" } } as never);
    mockDb.query.dailyRecords.findFirst = vi.fn().mockResolvedValueOnce(null);
    (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValueOnce([{ id: 42 }]),
      }),
    });
    const res = await POST(makePostRequest(validPayload));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.updated).toBe(false);
  });

  it("met à jour si une saisie existe déjà pour ce jour", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin", name: "admin" } } as never);
    mockDb.query.dailyRecords.findFirst = vi.fn().mockResolvedValueOnce({ id: 10 });
    (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValueOnce(undefined),
      }),
    });
    const res = await POST(makePostRequest(validPayload));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.updated).toBe(true);
    expect(json.id).toBe(10);
  });
});
