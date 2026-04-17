import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  redirect: vi.fn(),
}));

// Mock next-auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

// Mock DB
const mockDb = {
  query: {
    users: { findFirst: vi.fn() },
    farms: { findFirst: vi.fn(), findMany: vi.fn() },
    buildings: { findFirst: vi.fn(), findMany: vi.fn() },
    cycles: { findFirst: vi.fn(), findMany: vi.fn() },
    dailyRecords: { findFirst: vi.fn(), findMany: vi.fn() },
    sales: { findMany: vi.fn() },
    expenses: { findMany: vi.fn() },
    clients: { findFirst: vi.fn(), findMany: vi.fn() },
    settings: { findMany: vi.fn() },
    healthRecords: { findMany: vi.fn() },
    feedStock: { findMany: vi.fn() },
  },
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  transaction: vi.fn(),
};

mockDb.transaction.mockImplementation(async (callback) => callback(mockDb));

vi.mock("@/db", () => ({
  db: mockDb,
}));
