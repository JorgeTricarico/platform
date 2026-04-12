/**
 * Prisma extension utilities.
 *
 * - Logging extension: logs slow queries in production.
 * - Tenant scoping extension: automatically adds `business` filter to relevant queries.
 */
import type { PrismaClient } from '../generated/client/index.js';

const SLOW_QUERY_THRESHOLD_MS = 200;

/**
 * Logs slow queries (> SLOW_QUERY_THRESHOLD_MS) and errors.
 * Returns a new extended PrismaClient instance.
 */
export function applyLoggingMiddleware(prisma: PrismaClient): PrismaClient {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }: {
          operation: string;
          model: string;
          args: unknown;
          query: (args: unknown) => Promise<unknown>;
        }) {
          const start = Date.now();
          const result = await query(args);
          const duration = Date.now() - start;

          if (duration > SLOW_QUERY_THRESHOLD_MS) {
            console.warn(
              `[db] Slow query detected: ${model}.${operation} took ${duration}ms`,
              { args },
            );
          }

          return result;
        },
      },
    },
  }) as unknown as PrismaClient;
}

/**
 * TENANT SCOPING EXTENSION
 *
 * Automatically injects `tenantId: tenantSlug` into queries on models that
 * have a `tenantId` field. This ensures tenant isolation without requiring
 * every route handler to manually add the filter.
 *
 * Affected models: Client, User, ChatMessage, Garment, Finance, Appointment, PatientRecord, Notification
 *
 * @example
 *   const scopedPrisma = applyTenantMiddleware(prisma, 'zenco');
 *   // Now scopedPrisma.client.findMany() => WHERE tenantId = 'zenco'
 */
export function applyTenantMiddleware(prisma: PrismaClient, tenantSlug: string): PrismaClient {
  const SCOPED_MODELS = new Set([
    'Client',
    'User',
    'ChatMessage',
    'Garment',
    'Finance',
    'Appointment',
    'PatientRecord',
    'Notification',
  ]);

  const READ_ACTIONS = new Set(['findFirst', 'findMany', 'findUnique', 'count', 'aggregate', 'groupBy']);
  const WRITE_ACTIONS = new Set(['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany']);

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }: {
          operation: string;
          model: string;
          args: Record<string, unknown>;
          query: (args: Record<string, unknown>) => Promise<unknown>;
        }) {
          if (!SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const scopedArgs = { ...args };

          if (READ_ACTIONS.has(operation)) {
            scopedArgs['where'] = { ...(scopedArgs['where'] as Record<string, unknown> ?? {}), tenantId: tenantSlug };
          }

          if (WRITE_ACTIONS.has(operation)) {
            if (operation === 'create' || operation === 'upsert') {
              scopedArgs['data'] = { ...(scopedArgs['data'] as Record<string, unknown> ?? {}), tenantId: tenantSlug };
            } else if (operation === 'createMany') {
              const data = scopedArgs['data'];
              if (Array.isArray(data)) {
                scopedArgs['data'] = data.map((d: Record<string, unknown>) => ({
                  ...d,
                  tenantId: tenantSlug,
                }));
              }
            } else {
              // update, updateMany, delete, deleteMany — scope the WHERE
              scopedArgs['where'] = { ...(scopedArgs['where'] as Record<string, unknown> ?? {}), tenantId: tenantSlug };
            }
          }

          return query(scopedArgs);
        },
      },
    },
  }) as unknown as PrismaClient;
}
