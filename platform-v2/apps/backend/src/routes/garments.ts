import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AppError, ok, paginatedOk, type AppRequest } from '../types.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { buildPaginatedResponse, decodeCursor } from '../middleware/pagination.js';
import {
  createGarmentSchema,
  updateGarmentSchema,
  patchGarmentStatusSchema,
  listGarmentsSchema,
  uuidSchema,
} from '../schemas.js';

const router = Router();

router.use(requireAuth());

// ─── DB Helper ────────────────────────────────────────────────────────────────

interface DbGarment {
  id: string;
  orderNumber: number;
  clientId: string;
  garmentName: string;
  repairType: string;
  description: string;
  status: string;
  statusChangedAt: Date | null;
  intakeDate: string;
  deliveryDate: string;
  price: number;
  deposit: number;
  location: string | null;
  tenantId: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  client?: { id: string; name: string; phone: string };
  photos?: Array<{ id: string; url: string; filename: string; createdAt: Date }>;
}

function getDb(req: Request) {
  const db = (req as unknown as { db: {
    garment: {
      findMany: (args: unknown) => Promise<DbGarment[]>;
      findFirst: (args: unknown) => Promise<DbGarment | null>;
      create: (args: unknown) => Promise<DbGarment>;
      update: (args: unknown) => Promise<DbGarment>;
      count: (args: unknown) => Promise<number>;
    };
    $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<Array<{ max: number | null }>>;
  } }).db;
  if (!db) throw AppError.internal('Database not attached to request');
  return db;
}

// ─── GET /garments ────────────────────────────────────────────────────────────

router.get(
  '/',
  validate({ query: listGarmentsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const {
        cursor,
        limit,
        q,
        sortBy,
        sortDir,
        status,
        repairType,
        overdue,
        clientId,
        from,
        to,
      } = req.query as unknown as {
        cursor?: string;
        limit: number;
        q?: string;
        sortBy?: string;
        sortDir: 'asc' | 'desc';
        status?: string;
        repairType?: string;
        overdue: boolean;
        clientId?: string;
        from?: string;
        to?: string;
      };
      const db = getDb(req);

      const today = new Date().toISOString().slice(0, 10);

      const where: Record<string, unknown> = {
        tenantId: appReq.tenantId,
        deletedAt: null,
        ...(status && { status }),
        ...(repairType && { repairType: { contains: repairType, mode: 'insensitive' } }),
        ...(clientId && { clientId }),
        ...(overdue && { deliveryDate: { lt: today }, status: { notIn: ['entregado'] } }),
        ...(from || to
          ? {
              intakeDate: {
                ...(from && { gte: from }),
                ...(to && { lte: to }),
              },
            }
          : {}),
        ...(q
          ? {
              OR: [
                { garmentName: { contains: q, mode: 'insensitive' } },
                { repairType: { contains: q, mode: 'insensitive' } },
                { client: { name: { contains: q, mode: 'insensitive' } } },
                { client: { phone: { contains: q } } },
              ],
            }
          : {}),
      };

      const validSortFields = ['orderNumber', 'deliveryDate', 'intakeDate', 'createdAt', 'price'];
      const orderByField = validSortFields.includes(sortBy ?? '') ? sortBy! : 'createdAt';
      const orderBy = { [orderByField]: sortDir ?? 'desc' };

      const cursorId = cursor ? decodeCursor(cursor) : undefined;
      const cursorClause = cursorId ? { cursor: { id: cursorId }, skip: 1 } : {};

      const [items, total] = await Promise.all([
        db.garment.findMany({
          where,
          orderBy,
          take: (limit as number) + 1,
          ...cursorClause,
          include: { client: { select: { id: true, name: true, phone: true } } },
        }),
        db.garment.count({ where }),
      ]);

      const paginated = buildPaginatedResponse(items, limit as number, (g) => g.id);
      res.json(paginatedOk(paginated.items, paginated.cursor, paginated.hasMore, total));
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /garments/:id ────────────────────────────────────────────────────────

router.get(
  '/:id',
  validate({ params: uuidSchema.transform((id) => ({ id })) }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const db = getDb(req);

      const garment = await db.garment.findFirst({
        where: { id: req.params['id'], tenantId: appReq.tenantId, deletedAt: null },
        include: {
          client: { select: { id: true, name: true, phone: true } },
          photos: { orderBy: { createdAt: 'asc' } },
        },
      });

      if (!garment) throw AppError.notFound('Garment');
      res.json(ok(garment));
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /garments ───────────────────────────────────────────────────────────

router.post(
  '/',
  validate({ body: createGarmentSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const input = req.body as {
        clientId: string;
        garmentName: string;
        repairType: string;
        description: string;
        status: string;
        intakeDate: string;
        deliveryDate: string;
        price: number;
        deposit: number;
        location?: string;
      };
      const db = getDb(req);

      // Auto-increment orderNumber per tenant using raw query
      const result = await db.$queryRaw`
        SELECT COALESCE(MAX("orderNumber"), 0) as max
        FROM "Garment"
        WHERE "tenantId" = ${appReq.tenantId}
      `;
      const maxOrder = result[0]?.max ?? 0;
      const orderNumber = (maxOrder as number) + 1;

      const garment = await db.garment.create({
        data: {
          orderNumber,
          clientId: input.clientId,
          garmentName: input.garmentName,
          repairType: input.repairType,
          description: input.description,
          status: input.status,
          statusChangedAt: new Date(),
          intakeDate: input.intakeDate,
          deliveryDate: input.deliveryDate,
          price: input.price,
          deposit: input.deposit,
          location: input.location ?? null,
          tenantId: appReq.tenantId,
        },
        include: { client: { select: { id: true, name: true, phone: true } } },
      });

      res.status(201).json(ok(garment));
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /garments/:id ────────────────────────────────────────────────────────

router.put(
  '/:id',
  validate({ body: updateGarmentSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const db = getDb(req);

      const existing = await db.garment.findFirst({
        where: { id: req.params['id'], tenantId: appReq.tenantId, deletedAt: null },
      });
      if (!existing) throw AppError.notFound('Garment');

      const input = req.body as Partial<{
        garmentName: string;
        repairType: string;
        description: string;
        status: string;
        statusChangedAt: string;
        intakeDate: string;
        deliveryDate: string;
        price: number;
        deposit: number;
        location: string;
      }>;

      // Track status change timestamp automatically
      const statusChanged = input.status !== undefined && input.status !== existing.status;

      const updated = await db.garment.update({
        where: { id: existing.id },
        data: {
          ...(input.garmentName !== undefined && { garmentName: input.garmentName }),
          ...(input.repairType !== undefined && { repairType: input.repairType }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.status !== undefined && { status: input.status }),
          ...(statusChanged && { statusChangedAt: new Date() }),
          ...(input.statusChangedAt !== undefined && {
            statusChangedAt: new Date(input.statusChangedAt),
          }),
          ...(input.intakeDate !== undefined && { intakeDate: input.intakeDate }),
          ...(input.deliveryDate !== undefined && { deliveryDate: input.deliveryDate }),
          ...(input.price !== undefined && { price: input.price }),
          ...(input.deposit !== undefined && { deposit: input.deposit }),
          ...(input.location !== undefined && { location: input.location }),
        },
        include: { client: { select: { id: true, name: true, phone: true } } },
      });

      res.json(ok(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /garments/:id/status ───────────────────────────────────────────────

router.patch(
  '/:id/status',
  validate({ body: patchGarmentStatusSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const db = getDb(req);
      const { status } = req.body as { status: string };

      const existing = await db.garment.findFirst({
        where: { id: req.params['id'], tenantId: appReq.tenantId, deletedAt: null },
      });
      if (!existing) throw AppError.notFound('Garment');

      const updated = await db.garment.update({
        where: { id: existing.id },
        data: { status, statusChangedAt: new Date() },
      });

      res.json(ok(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /garments/:id ─────────────────────────────────────────────────────

router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const db = getDb(req);

      const existing = await db.garment.findFirst({
        where: { id: req.params['id'], tenantId: appReq.tenantId, deletedAt: null },
      });
      if (!existing) throw AppError.notFound('Garment');

      await db.garment.update({
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
