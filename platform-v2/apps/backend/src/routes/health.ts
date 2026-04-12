import { Router } from 'express';
import type { Request, Response } from 'express';
import type { AppRequest } from '../types.js';

const router = Router();

/**
 * GET /health
 * Returns service health status including DB connectivity and tenant resolution.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const appReq = req as Partial<AppRequest>;

  // DB connectivity: try a simple query if db is available
  let dbStatus: 'ok' | 'error' | 'unknown' = 'unknown';
  try {
    const db = (req as { db?: { $queryRaw: (q: unknown) => Promise<unknown> } }).db;
    if (db) {
      await db.$queryRaw`SELECT 1`;
      dbStatus = 'ok';
    }
  } catch {
    dbStatus = 'error';
  }

  const tenantLoaded = !!appReq.tenantId;

  const allOk = dbStatus !== 'error' && tenantLoaded;

  res.status(allOk ? 200 : 503).json({
    ok: allOk,
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      tenant: tenantLoaded ? 'ok' : 'not_loaded',
    },
    tenant: appReq.tenantId ?? null,
    version: process.env['npm_package_version'] ?? '0.0.1',
  });
});

export default router;
