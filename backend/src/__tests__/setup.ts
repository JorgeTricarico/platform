import { vi } from 'vitest';
import jwt from 'jsonwebtoken';

// Shared test JWT secret — must match vi.stubEnv in test files
export const TEST_JWT_SECRET = 'test-secret-key';

// Generate a valid auth token for tests
export function authHeader(business: string = 'zenco'): string {
  const token = jwt.sign(
    { userId: 'test-user', email: `test@${business}.com`, role: 'admin', business },
    TEST_JWT_SECRET,
    { expiresIn: '1h' },
  );
  return `Bearer ${token}`;
}

// Auto-set JWT_SECRET and enable auth for all tests
vi.stubEnv('JWT_SECRET', TEST_JWT_SECRET);
vi.stubEnv('REQUIRE_AUTH', 'true');

// Mock the db module so Prisma doesn't try to connect to a real DB
vi.mock('../db.js', () => {
  const mockPrisma = {
    order: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn().mockResolvedValue(null),
      groupBy: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    garmentPhoto: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      findUnique: vi.fn().mockResolvedValue(null),
      delete: vi.fn(),
    },
    zencoFinance: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    damianFinance: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    appointment: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
    },
    client: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    patientRecord: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    notification: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    chatMessage: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
  return { prisma: mockPrisma };
});
