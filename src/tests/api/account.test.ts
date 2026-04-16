import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/account/route";
import { auth } from "@/lib/auth";
import { db } from "@/db";

const mockAuth = auth as unknown as Mock;
const mockDb = vi.mocked(db);
const ctx = { params: Promise.resolve({}) };

function makePostRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/account", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost/api/account", { method: "GET" });
}

describe("GET /api/account", () => {
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

  it("retourne 404 si utilisateur introuvable en base", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    (mockDb.query.users.findFirst as Mock).mockResolvedValueOnce(null);
    const res = await GET(makeGetRequest(), ctx);
    expect(res.status).toBe(404);
  });

  it("retourne les données du compte si tout est OK", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    (mockDb.query.users.findFirst as Mock).mockResolvedValueOnce({
      id: 1,
      username: "admin",
      email: "admin@test.com",
      role: "admin",
      createdAt: new Date(),
    });
    const res = await GET(makeGetRequest(), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.username).toBe("admin");
    expect(json.email).toBe("admin@test.com");
    // Le hash du mot de passe ne doit pas être renvoyé
    expect(json.passwordHash).toBeUndefined();
  });
});

describe("POST /api/account (changement de mot de passe)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(
      makePostRequest({
        currentPassword: "old",
        newPassword: "NewPass1",
        confirmPassword: "NewPass1",
      }),
      ctx
    );
    expect(res.status).toBe(401);
  });

  it("retourne 400 si newPassword < 6 caractères", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    const res = await POST(
      makePostRequest({
        currentPassword: "old",
        newPassword: "ab",
        confirmPassword: "ab",
      }),
      ctx
    );
    expect(res.status).toBe(400);
  });

  it("retourne 400 si les mots de passe ne correspondent pas", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "1", role: "admin", name: "admin", farmId: "1" },
    } as never);
    const res = await POST(
      makePostRequest({
        currentPassword: "old",
        newPassword: "NewPass1",
        confirmPassword: "Different1",
      }),
      ctx
    );
    expect(res.status).toBe(400);
  });
});
