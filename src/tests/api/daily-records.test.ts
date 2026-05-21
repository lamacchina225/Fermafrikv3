import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/daily-records/route";
import { auth } from "@/lib/auth";
import { db } from "@/db";

const mockAuth = auth as unknown as Mock;
const mockDb = vi.mocked(db);
const ctx = { params: Promise.resolve({}) };

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

const validLinkedExpense = {
  label: "Achat vitamines",
  amount: 15000,
  category: "sante",
} as const;

describe("POST /api/daily-records", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifie", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makePostRequest(validPayload), ctx);
    expect(res.status).toBe(401);
  });

  it("retourne 403 pour le role demo (lecture seule)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "3", role: "demo", name: "demo", farmId: "1" } } as never);
    const res = await POST(makePostRequest(validPayload), ctx);
    expect(res.status).toBe(403);
  });

  it("retourne 400 si les donnees sont invalides (oeufs negatifs)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin", name: "admin", farmId: "1" } } as never);
    const res = await POST(makePostRequest({ ...validPayload, eggsCollected: -10 }), ctx);
    expect(res.status).toBe(400);
  });

  it("retourne 400 si recordDate depasse 10 chars", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin", name: "admin", farmId: "1" } } as never);
    const res = await POST(makePostRequest({ ...validPayload, recordDate: "2026-03-31T00:00:00Z" }), ctx);
    expect(res.status).toBe(400);
  });

  it("cree une saisie avec des donnees valides", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin", name: "admin", farmId: "1" } } as never);
    const insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValueOnce([{ id: 42 }]),
      }),
    });

    (mockDb.transaction as Mock).mockImplementationOnce(async (callback) =>
      callback({
        ...mockDb,
        insert,
        query: {
          ...mockDb.query,
          dailyRecords: { findFirst: vi.fn().mockResolvedValueOnce(null) },
          expenses: { findFirst: vi.fn().mockResolvedValue(null) },
        },
      } as never)
    );

    const res = await POST(makePostRequest(validPayload), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.updated).toBe(false);
  });

  it("cree aussi une depense automatique d'alimentation si feedCost > 0", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin", name: "admin", farmId: "1" } } as never);

    const dailyInsertReturning = vi.fn().mockResolvedValueOnce([{ id: 43 }]);
    const expenseInsertValues = vi.fn().mockResolvedValueOnce(undefined);
    const insert = vi.fn()
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: dailyInsertReturning,
        }),
      })
      .mockReturnValueOnce({
        values: expenseInsertValues,
      });

    (mockDb.transaction as Mock).mockImplementationOnce(async (callback) =>
      callback({
        ...mockDb,
        insert,
        query: {
          ...mockDb.query,
          dailyRecords: { findFirst: vi.fn().mockResolvedValueOnce(null) },
          expenses: { findFirst: vi.fn().mockResolvedValue(null) },
        },
      } as never)
    );

    const res = await POST(makePostRequest({ ...validPayload, feedCost: 24000 }), ctx);
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledTimes(2);
    expect(expenseInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Alimentation quotidienne",
        category: "alimentation",
        amount: "24000",
        expenseDate: "2026-03-31",
      })
    );
  });

  it("met a jour si une saisie existe deja pour ce jour", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin", name: "admin", farmId: "1" } } as never);
    const update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValueOnce(undefined),
      }),
    });

    (mockDb.transaction as Mock).mockImplementationOnce(async (callback) =>
      callback({
        ...mockDb,
        update,
        query: {
          ...mockDb.query,
          dailyRecords: { findFirst: vi.fn().mockResolvedValueOnce({ id: 10, cycleId: 1, buildingId: 1, recordDate: "2026-03-31" }) },
          expenses: { findFirst: vi.fn().mockResolvedValue(null) },
        },
      } as never)
    );

    const res = await POST(makePostRequest(validPayload), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.updated).toBe(true);
    expect(json.id).toBe(10);
  });

  it("met a jour une saisie ciblee par recordId et sa depense liee", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin", name: "admin", farmId: "1" } } as never);
    const update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    (mockDb.transaction as Mock).mockImplementationOnce(async (callback) =>
      callback({
        ...mockDb,
        update,
        query: {
          ...mockDb.query,
          dailyRecords: {
            findFirst: vi
              .fn()
              .mockResolvedValueOnce({
                id: 10,
                farmId: 1,
                buildingId: 1,
                cycleId: 1,
                recordDate: "2026-03-30",
              })
              .mockResolvedValueOnce(null),
          },
          expenses: {
            findFirst: vi
              .fn()
              .mockResolvedValueOnce(null)
              .mockResolvedValueOnce({
                id: 90,
                label: "[DAILY_RECORD:10] Ancienne depense",
              }),
          },
        },
      } as never)
    );

    const res = await POST(
      makePostRequest({
        ...validPayload,
        recordId: 10,
        linkedExpense: validLinkedExpense,
      }),
      ctx
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.updated).toBe(true);
    expect(json.id).toBe(10);
  });
});
