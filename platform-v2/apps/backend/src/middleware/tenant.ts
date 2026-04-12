import type { Request, Response, NextFunction } from 'express';
import type { TenantConfig } from '@platform/config';
import { AppError, type AppRequest } from '../types.js';

// ─── Tenant Config Loader ─────────────────────────────────────────────────────
// In a real deployment, tenants are loaded from the DB or from the tenants/
// package. We expose a registry interface so callers can inject loaders.

type TenantLoader = (slug: string) => Promise<TenantConfig | null>;

let _loader: TenantLoader | null = null;

/** Register the function that resolves a slug → TenantConfig. Call once at startup. */
export function registerTenantLoader(loader: TenantLoader): void {
  _loader = loader;
}

// ─── In-Memory Cache ──────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1_000; // 5 minutes

interface CacheEntry {
  config: TenantConfig;
  expiresAt: number;
}

const tenantCache = new Map<string, CacheEntry>();

async function resolveTenantConfig(slug: string): Promise<TenantConfig | null> {
  const cached = tenantCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.config;
  }

  if (!_loader) {
    throw AppError.internal('Tenant loader not registered. Call registerTenantLoader() at startup.');
  }

  const config = await _loader(slug);
  if (config) {
    tenantCache.set(slug, { config, expiresAt: Date.now() + CACHE_TTL_MS });
  }
  return config;
}

/** Flush the cache for a specific tenant (or all if slug omitted). */
export function invalidateTenantCache(slug?: string): void {
  if (slug) {
    tenantCache.delete(slug);
  } else {
    tenantCache.clear();
  }
}

// ─── Slug Resolution ──────────────────────────────────────────────────────────

function resolveSlug(req: Request): string | null {
  // 1. Explicit header: X-Tenant-ID: zenco
  const header = req.headers['x-tenant-id'];
  if (typeof header === 'string' && header.trim()) {
    return header.trim().toLowerCase();
  }

  // 2. Subdomain: zenco.platform.app → "zenco"
  const host = req.hostname;
  if (host) {
    const parts = host.split('.');
    // e.g. zenco.platform.app → parts[0] = "zenco"
    // skip "www" and bare domains (only 1-2 parts)
    if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'api') {
      return parts[0]!.toLowerCase();
    }
  }

  // 3. TENANT env var (used in single-tenant Render deployments)
  const envTenant = process.env['TENANT'];
  if (envTenant?.trim()) {
    return envTenant.trim().toLowerCase();
  }

  return null;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const slug = resolveSlug(req);

    if (!slug) {
      res.status(400).json({
        ok: false,
        error: 'Tenant could not be resolved. Provide X-Tenant-ID header or configure TENANT env var.',
        code: 'TENANT_REQUIRED',
      });
      return;
    }

    const config = await resolveTenantConfig(slug);

    if (!config) {
      res.status(404).json({
        ok: false,
        error: `Tenant "${slug}" not found`,
        code: 'TENANT_NOT_FOUND',
      });
      return;
    }

    const appReq = req as AppRequest;
    appReq.tenantId = config.slug;
    appReq.tenant = config;

    next();
  } catch (err) {
    next(err);
  }
}
