import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/health/route";
import { auth } from "@/lib/auth";
import { db } from "@/db";

const mockAuth = auth as unknown as Mock;
const mockDb = vi.mocked(db);
const ctx = { params: Promise.resolve({}) };

function makePostRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/health", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeGetRequest(query = ""): NextRequest {
  return new NextRequest(`http://localhost/api/health${query}`, { method: "GET" });
}

const validHealth = {
  buildingId: 1,
  cycleId: 1,
  recordDate: "2026-04-10",
  type: "vaccination",
  productName: "IB+ND",
  dose: "1ml/litre",
  cost: 15000,
  notes: "Vaccination de rappel",
};

describe("GET /api/health", () => {
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

  it("supporte la pagination via limit et offset", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    (mockDb.query.healthRecords.findMany as Mock).mockResolvedValueOnce([]);
    (mockDb.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValueOnce([{ count: 0 }]),
      }),
    });
    const res = await GET(makeGetRequest("?limit=10&offset=5"), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.pagination).toBeDefined();
    expect(json.pagination.limit).toBe(10);
    expect(json.pagination.offset).toBe(5);
  });
});

describe("POST /api/health", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makePostRequest(validHealth), ctx);
    expect(res.status).toBe(401);
  });

  it("retourne 403 pour le rôle demo", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "3", role: "demo", name: "demo", farmId: "1" },
    } as never);
    const res = await POST(makePostRequest(validHealth), ctx);
    expect(res.status).toBe(403);
  });

  it("retourne 400 si type invalide", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    const res = await POST(makePostRequest({ ...validHealth, type: "invalid" }), ctx);
    expect(res.status).toBe(400);
  });

  it("retourne 400 si productName manquant", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    const res = await POST(makePostRequest({ ...validHealth, productName: "" }), ctx);
    expect(res.status).toBe(400);
  });

  it("retourne 400 si recordDate dépasse 10 chars", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    const res = await POST(
      makePostRequest({ ...validHealth, recordDate: "2026-04-10T00:00:00Z" }),
      ctx
    );
    expect(res.status).toBe(400);
  });

  it("crée un enregistrement santé et une dépense santé liée si le coût est positif", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);

    const healthReturning = vi.fn().mockResolvedValueOnce([{ id: 12, ...validHealth }]);
    const expenseValues = vi.fn().mockResolvedValueOnce(undefined);
    const insert = vi.fn()
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: healthReturning,
        }),
      })
      .mockReturnValueOnce({
        values: expenseValues,
      });

    mockDb.transaction = vi.fn(async (callback) => callback({ insert } as never)) as never;

    const res = await POST(makePostRequest(validHealth), ctx);
    expect(res.status).toBe(200);

    expect(insert).toHaveBeenCalledTimes(2);
    expect(expenseValues).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "sante",
        label: "Vaccination - IB+ND",
        amount: "15000",
        expenseDate: "2026-04-10",
      })
    );
  });

  it("ne crée pas de dépense liée si le coût est nul ou absent", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);

    const insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValueOnce([{ id: 13, ...validHealth, cost: 0 }]),
      }),
    });

    mockDb.transaction = vi.fn(async (callback) =>
      callback({ insert } as never)
    ) as never;

    const res = await POST(makePostRequest({ ...validHealth, cost: 0 }), ctx);
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
