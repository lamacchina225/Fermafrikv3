import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/sales/route";
import { PUT } from "@/app/api/sales/[id]/route";
import { auth } from "@/lib/auth";
import { db } from "@/db";

const mockAuth = auth as unknown as Mock;
const mockDb = vi.mocked(db);
const ctx = { params: Promise.resolve({}) };

function makeRequest(body: object, method = "POST"): NextRequest {
  return new NextRequest("http://localhost/api/sales", {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeGetRequest(query = ""): NextRequest {
  return new NextRequest(`http://localhost/api/sales${query}`, { method: "GET" });
}

function makeSaleIdContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const validSale = {
  buildingId: 1,
  cycleId: 1,
  saleDate: "2026-03-31",
  traysSold: 10,
  unitPrice: 3500,
  buyerName: "Kouamé",
};

describe("POST /api/sales", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(validSale), ctx);
    expect(res.status).toBe(401);
  });

  it("retourne 403 pour le rôle demo", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "3", role: "demo", name: "demo", farmId: "1" },
    } as never);
    const res = await POST(makeRequest(validSale), ctx);
    expect(res.status).toBe(403);
  });

  it("retourne 403 si pas de farmId", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: null },
    } as never);
    const res = await POST(makeRequest(validSale), ctx);
    expect(res.status).toBe(403);
  });

  it("retourne 400 si traysSold < 1", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    const res = await POST(makeRequest({ ...validSale, traysSold: 0 }), ctx);
    expect(res.status).toBe(400);
  });

  it("retourne 400 si saleDate dépasse 10 chars", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    const res = await POST(makeRequest({ ...validSale, saleDate: "2026-03-31T12:00:00Z" }), ctx);
    expect(res.status).toBe(400);
  });

  it("retourne 400 si buyerName dépasse 200 chars", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    const res = await POST(makeRequest({ ...validSale, buyerName: "A".repeat(201) }), ctx);
    expect(res.status).toBe(400);
  });

  it("crée une vente valide et retourne 200", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    const newSale = { id: 5, ...validSale, totalAmount: "35000", unitPrice: "3500", farmId: 1 };
    (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValueOnce([newSale]),
      }),
    });
    const res = await POST(makeRequest(validSale), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sale).toBeDefined();
    expect(json.sale.id).toBe(5);
  });

  it("retourne 409 si une vente existe deja pour cette date", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    mockDb.query.sales.findFirst.mockResolvedValueOnce({
      id: 9,
      ...validSale,
      farmId: 1,
      totalAmount: "35000",
    });

    const res = await POST(makeRequest(validSale), ctx);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("existe deja");
    expect(json.existingSale.id).toBe(9);
  });
});

describe("PUT /api/sales/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 403 pour le role demo", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "3", role: "demo", name: "demo", farmId: "1" },
    } as never);

    const res = await PUT(makeRequest(validSale, "PUT"), makeSaleIdContext("5"));

    expect(res.status).toBe(403);
  });

  it("retourne 404 si la vente n'appartient pas a la ferme", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    mockDb.query.sales.findFirst.mockResolvedValueOnce(null);

    const res = await PUT(makeRequest(validSale, "PUT"), makeSaleIdContext("5"));

    expect(res.status).toBe(404);
  });

  it("modifie une vente et recalcule totalAmount", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    mockDb.query.sales.findFirst.mockResolvedValueOnce({ id: 5, farmId: 1 });

    const updatedSale = {
      id: 5,
      ...validSale,
      traysSold: 12,
      unitPrice: "4000",
      totalAmount: "48000",
      farmId: 1,
    };
    (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValueOnce([updatedSale]),
        }),
      }),
    });

    const res = await PUT(
      makeRequest({ ...validSale, traysSold: 12, unitPrice: 4000 }, "PUT"),
      makeSaleIdContext("5")
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sale.totalAmount).toBe("48000");
  });

  it("retourne 409 si la nouvelle date a deja une autre vente", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    mockDb.query.sales.findFirst
      .mockResolvedValueOnce({ id: 5, farmId: 1 })
      .mockResolvedValueOnce({ id: 9, farmId: 1, saleDate: validSale.saleDate, traysSold: 12 });

    const res = await PUT(makeRequest(validSale, "PUT"), makeSaleIdContext("5"));

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.existingSale.id).toBe(9);
  });
});
