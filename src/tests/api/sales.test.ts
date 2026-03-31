import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/sales/route";
import { auth } from "@/lib/auth";
import { db } from "@/db";

const mockAuth = auth as unknown as Mock;
const mockDb = vi.mocked(db);

function makeRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/sales", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
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
    const res = await POST(makeRequest(validSale));
    expect(res.status).toBe(401);
  });

  it("retourne 403 pour le rôle demo", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "3", role: "demo", name: "demo" } } as never);
    const res = await POST(makeRequest(validSale));
    expect(res.status).toBe(403);
  });

  it("retourne 400 si traysSold < 1", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin", name: "admin" } } as never);
    const res = await POST(makeRequest({ ...validSale, traysSold: 0 }));
    expect(res.status).toBe(400);
  });

  it("retourne 400 si saleDate dépasse 10 chars", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin", name: "admin" } } as never);
    const res = await POST(makeRequest({ ...validSale, saleDate: "2026-03-31T12:00:00Z" }));
    expect(res.status).toBe(400);
  });

  it("retourne 400 si buyerName dépasse 200 chars", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin", name: "admin" } } as never);
    const res = await POST(makeRequest({ ...validSale, buyerName: "A".repeat(201) }));
    expect(res.status).toBe(400);
  });

  it("crée une vente valide et retourne 201", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin", name: "admin" } } as never);
    const newSale = { id: 5, ...validSale, totalAmount: "35000", unitPrice: "3500" };
    (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValueOnce([newSale]),
      }),
    });
    const res = await POST(makeRequest(validSale));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sale).toBeDefined();
    expect(json.sale.id).toBe(5);
  });
});
