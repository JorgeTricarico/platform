import { vi } from 'vitest';

// Mock the db module so Prisma doesn't try to connect to a real DB
vi.mock('../db.js', () => {
  const mockPrisma = {
    order: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    zencoFinance: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    },
    damianFinance: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
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
      count: vi.fn().mockResolvedValue(0),
    },
    patientRecord: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
  };
  return { prisma: mockPrisma };
});
