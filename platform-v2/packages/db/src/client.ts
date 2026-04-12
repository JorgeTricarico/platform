/**
 * PrismaClient factory for SQLite (local dev/testing).
 *
 * Usage:
 *   const prisma = getPrismaClient(); // singleton
 */
import { PrismaClient } from '../generated/client/index.js';

let _instance: PrismaClient | null = null;

/**
 * Returns a singleton PrismaClient instance.
 * On first call, creates the client using DATABASE_URL.
 * Subsequent calls return the cached instance.
 */
export function getPrismaClient(): PrismaClient {
  if (!_instance) {
    _instance = new PrismaClient({
      log: process.env['NODE_ENV'] === 'development' ? ['query', 'warn', 'error'] : ['error'],
    });
  }
  return _instance;
}

/**
 * Gracefully disconnect the singleton.
 * Call this in process shutdown hooks.
 */
export async function disconnectPrisma(): Promise<void> {
  if (_instance) {
    await _instance.$disconnect();
    _instance = null;
  }
}
