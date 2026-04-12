import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { Request, Response } from 'express';
import { tenantMiddleware, registerTenantLoader } from './middleware/tenant.js';
import { paginationMiddleware } from './middleware/pagination.js';
import { requestLogger, notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import api from './router.js';

// ─── Tenant Registry ──────────────────────────────────────────────────────────
// Register the loader that resolves slug → TenantConfig.
// Tenants are supplied via TENANT_CONFIG_<SLUG> env vars (JSON) or a local map.

async function loadTenantRegistry(): Promise<void> {
  const tenantMap = new Map<string, import('@platform/config').TenantConfig>();

  const slugs = (process.env['TENANTS'] ?? 'zenco,mg_masajes')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const slug of slugs) {
    const envKey = `TENANT_CONFIG_${slug.toUpperCase()}`;
    const rawJson = process.env[envKey];
    if (rawJson) {
      try {
        const { TenantConfigSchema } = await import('@platform/config');
        const config = TenantConfigSchema.parse(JSON.parse(rawJson));
        tenantMap.set(slug, config);
        console.log(`[tenant] Loaded "${slug}" from env`);
      } catch (err) {
        console.warn(`[tenant] Invalid config for "${slug}":`, (err as Error).message);
      }
    } else {
      console.warn(`[tenant] No config found for "${slug}" (env var ${envKey} not set)`);
    }
  }

  registerTenantLoader(async (slug) => tenantMap.get(slug) ?? null);
}

// ─── App Factory ──────────────────────────────────────────────────────────────

export function createApp(): express.Application {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  const allowedOrigins = (process.env['CORS_ORIGIN'] ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (process.env['NODE_ENV'] !== 'production') return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin "${origin}" not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    }),
  );

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logger
  app.use(requestLogger);

  // Tenant resolution — exempt bare /health so load-balancers can ping freely
  app.use((req: Request, res: Response, next) => {
    if (req.path === '/health') return next();
    return tenantMiddleware(req, res, next);
  });

  // Pagination defaults
  app.use(paginationMiddleware());

  // Bare /health (no tenant context needed)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, status: 'healthy', ts: new Date().toISOString() });
  });

  // All API routes
  app.use('/api', api);

  // 404 + error handlers (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

async function main(): Promise<void> {
  await loadTenantRegistry();

  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(
      `[server] Platform backend listening on port ${PORT} (${process.env['NODE_ENV'] ?? 'development'})`,
    );
  });

  // Graceful shutdown
  function shutdown(signal: string): void {
    console.log(`[server] ${signal} — shutting down…`);
    server.close(() => {
      console.log('[server] HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[server] Force-killing after timeout');
      process.exit(1);
    }, 10_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('[server] Unhandled rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[server] Uncaught exception:', err);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});

export { createApp as app };
