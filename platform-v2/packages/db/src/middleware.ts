/**
 * Prisma middleware utilities.
 *
 * - Logging middleware: logs slow queries in production.
 * - Tenant scoping middleware: automatically adds `business` filter to relevant queries.
 */
import type { PrismaClient } from '../generated/client/index.js';

type PrismaMiddleware = Parameters<PrismaClient['$use']>[0];

const SLOW_QUERY_THRESHOLD_MS = 200;

/**
 * Logs slow queries (> SLOW_QUERY_THRESHOLD_MS) and errors.
 */
export function applyLoggingMiddleware(prisma: PrismaClient): void {
  const middleware: PrismaMiddleware = async (params, next) => {
    const start = Date.now();
    const result = await next(params);
    const duration = Date.now() - start;

    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(
        `[db] Slow query detected: ${params.model}.${params.action} took ${duration}ms`,
        { args: params.args },
      );
    }

    return result;
  };

  prisma.$use(middleware);
}

/**
 * TENANT SCOPING MIDDLEWARE
 *
 * Automatically injects `business: tenantSlug` into queries on models that
 * have a `business` field. This ensures tenant isolation without requiring
 * every route handler to manually add the filter.
 *
 * Affected models: Client, User, ChatMessage
 *
 * @example
 *   applyTenantMiddleware(prisma, 'zenco');
 *   // Now prisma.client.findMany() => WHERE business = 'zenco'
 */
export function applyTenantMiddleware(prisma: PrismaClient, tenantSlug: string): void {
  const SCOPED_MODELS = new Set(['Client', 'User', 'ChatMessage']);

  const READ_ACTIONS = new Set(['findFirst', 'findMany', 'findUnique', 'count', 'aggregate', 'groupBy']);
  const WRITE_ACTIONS = new Set(['create', 'createMany', 'update', 'updateMany', 'upsert']);

  const middleware: PrismaMiddleware = async (params, next) => {
    if (!params.model || !SCOPED_MODELS.has(params.model)) {
      return next(params);
    }

    if (READ_ACTIONS.has(params.action)) {
      params.args = params.args ?? {};
      params.args.where = { ...params.args.where, business: tenantSlug };
    }

    if (WRITE_ACTIONS.has(params.action)) {
      if (params.action === 'create' || params.action === 'upsert') {
        params.args = params.args ?? {};
        params.args.data = { ...params.args.data, business: tenantSlug };
      } else if (params.action === 'createMany') {
        params.args = params.args ?? {};
        if (Array.isArray(params.args.data)) {
          params.args.data = params.args.data.map((d: Record<string, unknown>) => ({
            ...d,
            business: tenantSlug,
          }));
        }
      } else {
        // update, updateMany — scope the WHERE
        params.args = params.args ?? {};
        params.args.where = { ...params.args.where, business: tenantSlug };
      }
    }

    return next(params);
  };

  prisma.$use(middleware);
}
