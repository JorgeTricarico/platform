/**
 * PrismaClient factory with pg adapter (required for Supabase connection pooler).
 *
 * Usage:
 *   const prisma = getPrismaClient(); // singleton
 *   const prisma = createPrismaClient(connectionString); // new instance
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/index.js';
import pg from 'pg';

export interface PrismaClientOptions {
  /** PostgreSQL connection string. Falls back to DATABASE_URL env var. */
  databaseUrl?: string;
  /** Log levels. Default: ['warn', 'error'] in production, ['query', 'info', 'warn', 'error'] in dev */
  log?: ('query' | 'info' | 'warn' | 'error')[];
}

export function createPrismaClient(options: PrismaClientOptions = {}): PrismaClient {
  const databaseUrl = options.databaseUrl ?? process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error(
      '[db] DATABASE_URL is not set. Provide it via env or createPrismaClient({ databaseUrl })',
    );
  }

  const isDev = process.env['NODE_ENV'] !== 'production';

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);

  const logLevels = options.log ?? (isDev ? (['query', 'info', 'warn', 'error'] as const) : (['warn', 'error'] as const));

  return new PrismaClient({
    adapter,
    log: logLevels.map((level) => ({ emit: 'event', level })),
  }) as PrismaClient;
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: PrismaClient | null = null;

/**
 * Returns a singleton PrismaClient instance.
 * On first call, creates the client using DATABASE_URL.
 * Subsequent calls return the cached instance.
 */
export function getPrismaClient(): PrismaClient {
  if (!_instance) {
    _instance = createPrismaClient();
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
