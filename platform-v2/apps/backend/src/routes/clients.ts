import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AppError, ok, paginatedOk, type AppRequest } from '../types.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { buildPaginatedResponse, decodeCursor } from '../middleware/pagination.js';
import {
  createClientSchema,
  updateClientSchema,
  listClientsSchema,
  uuidSchema,
} from '../schemas.js';

const router = Router();

// All client routes require authentication
router.use(requireAuth());

// ─── DB Helper ────────────────────────────────────────────────────────────────

function getDb(req: Request) {
  const db = (req as unknown as { db: {
    client: {
      findMany: (args: unknown) => Promise<DbClient[]>;
      findFirst: (args: unknown) => Promise<DbClient | null>;
      findUnique: (args: unknown) => Promise<DbClient | null>;
      create: (args: unknown) => Promise<DbClient>;
      update: (args: unknown) => Promise<DbClient>;
      count: (args: unknown) => Promise<number>;
    }
  } }).db;
  if (!db) throw AppError.internal('Database not attached to request');
  return db;
}

interface DbClient {
  id: string;
  name: string;
  phone: string;
  altPhone: string | null;
  notes: string | null;
  tenantId: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── GET /clients ─────────────────────────────────────────────────────────────

router.get(
  '/',
  validate({ query: listClientsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const { cursor, limit, q, sortBy, sortDir, includeDeleted } = req.query as unknown as {
        cursor?: string;
        limit: number;
        q?: string;
        sortBy?: string;
        sortDir: 'asc' | 'desc';
        includeDeleted: boolean;
      };
      const db = getDb(req);

      // Build where clause
      const where: Record<string, unknown> = {
        tenantId: appReq.tenantId,
        ...(includeDeleted ? {} : { deletedAt: null }),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      };

      // Cursor decoding
      const cursorId = cursor ? decodeCursor(cursor) : undefined;
      const cursorClause = cursorId ? { cursor: { id: cursorId }, skip: 1 } : {};

      // Ordering
      const validSortFields = ['name', 'phone', 'createdAt'];
      const orderByField = validSortFields.includes(sortBy ?? '') ? sortBy! : 'createdAt';
      const orderBy = { [orderByField]: sortDir ?? 'desc' };

      const [items, total] = await Promise.all([
        db.client.findMany({
          where,
          orderBy,
          take: (limit as number) + 1,
          ...cursorClause,
        }),
        db.client.count({ where }),
      ]);

      const paginated = buildPaginatedResponse(items, limit as number, (c) => c.id);

      res.json(paginatedOk(paginated.items, paginated.cursor, paginated.hasMore, total));
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /clients/:id ─────────────────────────────────────────────────────────

router.get(
  '/:id',
  validate({ params: uuidSchema.transform((id) => ({ id })) }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const db = getDb(req);

      const client = await db.client.findFirst({
        where: { id: req.params['id'], tenantId: appReq.tenantId, deletedAt: null },
      });

      if (!client) {
        throw AppError.notFound('Client');
      }

      res.json(ok(client));
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /clients ────────────────────────────────────────────────────────────

router.post(
  '/',
  validate({ body: createClientSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const input = req.body as {
        name: string;
        phone: string;
        altPhone?: string;
        notes?: string;
      };
      const db = getDb(req);

      // Unique phone per tenant
      const duplicate = await db.client.findFirst({
        where: { phone: input.phone, tenantId: appReq.tenantId, deletedAt: null },
      });
      if (duplicate) {
        throw AppError.conflict(`A client with phone "${input.phone}" already exists`);
      }

      const client = await db.client.create({
        data: {
          name: input.name,
          phone: input.phone,
          altPhone: input.altPhone ?? null,
          notes: input.notes ?? null,
          tenantId: appReq.tenantId,
        },
      });

      res.status(201).json(ok(client));
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /clients/:id ─────────────────────────────────────────────────────────

router.put(
  '/:id',
  validate({ body: updateClientSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const db = getDb(req);

      const existing = await db.client.findFirst({
        where: { id: req.params['id'], tenantId: appReq.tenantId, deletedAt: null },
      });
      if (!existing) {
        throw AppError.notFound('Client');
      }

      const input = req.body as Partial<{
        name: string;
        phone: string;
        altPhone: string;
        notes: string;
      }>;

      // If phone is changing, check uniqueness
      if (input.phone && input.phone !== existing.phone) {
        const duplicate = await db.client.findFirst({
          where: { phone: input.phone, tenantId: appReq.tenantId, deletedAt: null },
        });
        if (duplicate) {
          throw AppError.conflict(`A client with phone "${input.phone}" already exists`);
        }
      }

      const updated = await db.client.update({
        where: { id: existing.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.phone !== undefined && { phone: input.phone }),
          ...(input.altPhone !== undefined && { altPhone: input.altPhone }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
      });

      res.json(ok(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /clients/:id (soft delete) ───────────────────────────────────────

router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const db = getDb(req);

      const existing = await db.client.findFirst({
        where: { id: req.params['id'], tenantId: appReq.tenantId, deletedAt: null },
      });
      if (!existing) {
        throw AppError.notFound('Client');
      }

      await db.client.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });

      res.json(ok({ id: existing.id, deleted: true }));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
