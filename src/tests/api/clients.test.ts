import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/clients/route";
import { auth } from "@/lib/auth";
import { db } from "@/db";

const mockAuth = auth as unknown as Mock;
const mockDb = vi.mocked(db);

function makeRequest(method = "GET", body?: object): NextRequest {
  return new NextRequest("http://localhost/api/clients", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/clients", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Non autorisé");
  });

  it("retourne la liste des clients si authentifié", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin", name: "admin", farmId: "1" } } as never);
    const fakeClients = [{ id: 1, name: "Client A", city: "Abidjan", phone: null, createdAt: new Date() }];
    (mockDb.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValueOnce(fakeClients),
        }),
      }),
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.clients).toHaveLength(1);
    expect(json.clients[0].name).toBe("Client A");
  });
});

describe("POST /api/clients", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makeRequest("POST", { name: "Test" }));
    expect(res.status).toBe(401);
  });

  it("retourne 400 si le nom est vide", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin", name: "admin", farmId: "1" } } as never);
    const res = await POST(makeRequest("POST", { name: "" }));
    expect(res.status).toBe(400);
  });

  it("crée un client avec un nom valide", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin", name: "admin", farmId: "1" } } as never);
    const newClient = { id: 2, name: "Kouassi", city: "Yamoussoukro", phone: null, createdAt: new Date() };
    (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValueOnce([newClient]),
      }),
    });
    const res = await POST(makeRequest("POST", { name: "Kouassi", city: "Yamoussoukro" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.client.name).toBe("Kouassi");
  });
});
