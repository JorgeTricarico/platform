import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AppError, ok, paginatedOk, type AppRequest } from '../types.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { buildPaginatedResponse, decodeCursor } from '../middleware/pagination.js';
import {
  createPatientRecordSchema,
  updatePatientRecordSchema,
  listPatientRecordsSchema,
  uuidSchema,
} from '../schemas.js';

// Note: this router uses mergeParams so it receives :patientId from parent router
const router = Router({ mergeParams: true });

router.use(requireAuth());

// ─── DB Helper ────────────────────────────────────────────────────────────────

interface DbPatientRecord {
  id: string;
  clientId: string;
  date: string;
  reason: string;
  symptoms: string | null;
  areas: string | null;
  treatment: string | null;
  observations: string | null;
  nextSession: string | null;
  tenantId: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function getDb(req: Request) {
  const db = (req as unknown as { db: {
    patientRecord: {
      findMany: (args: unknown) => Promise<DbPatientRecord[]>;
      findFirst: (args: unknown) => Promise<DbPatientRecord | null>;
      create: (args: unknown) => Promise<DbPatientRecord>;
      update: (args: unknown) => Promise<DbPatientRecord>;
      count: (args: unknown) => Promise<number>;
    };
    client: {
      findFirst: (args: unknown) => Promise<{ id: string } | null>;
    }
  } }).db;
  if (!db) throw AppError.internal('Database not attached to request');
  return db;
}

// ─── Patient existence guard ──────────────────────────────────────────────────

async function requirePatient(
  db: ReturnType<typeof getDb>,
  patientId: string,
  tenantId: string,
): Promise<void> {
  const client = await db.client.findFirst({
    where: { id: patientId, tenantId, deletedAt: null },
  });
  if (!client) throw AppError.notFound('Patient');
}

// ─── GET /patients/:patientId/records ─────────────────────────────────────────

router.get(
  '/',
  validate({ query: listPatientRecordsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const patientId = req.params['patientId'] as string;
      if (!patientId) throw AppError.badRequest('patientId is required');

      const { cursor, limit, sortDir, from, to } = req.query as unknown as {
        cursor?: string;
        limit: number;
        sortDir: 'asc' | 'desc';
        from?: string;
        to?: string;
      };
      const db = getDb(req);

      await requirePatient(db, patientId, appReq.tenantId);

      const where: Record<string, unknown> = {
        clientId: patientId,
        tenantId: appReq.tenantId,
        deletedAt: null,
        ...(from || to
          ? {
              date: {
                ...(from && { gte: from }),
                ...(to && { lte: to }),
              },
            }
          : {}),
      };

      const cursorId = cursor ? decodeCursor(cursor) : undefined;
      const cursorClause = cursorId ? { cursor: { id: cursorId }, skip: 1 } : {};

      const [items, total] = await Promise.all([
        db.patientRecord.findMany({
          where,
          orderBy: { date: sortDir ?? 'desc' },
          take: (limit as number) + 1,
          ...cursorClause,
        }),
        db.patientRecord.count({ where }),
      ]);

      const paginated = buildPaginatedResponse(items, limit as number, (r) => r.id);
      res.json(paginatedOk(paginated.items, paginated.cursor, paginated.hasMore, total));
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /patients/:patientId/records ────────────────────────────────────────

router.post(
  '/',
  validate({ body: createPatientRecordSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const patientId = req.params['patientId'] as string;
      if (!patientId) throw AppError.badRequest('patientId is required');

      const input = req.body as {
        date: string;
        reason: string;
        symptoms?: string;
        areas?: string;
        treatment?: string;
        observations?: string;
        nextSession?: string;
      };
      const db = getDb(req);

      await requirePatient(db, patientId, appReq.tenantId);

      const record = await db.patientRecord.create({
        data: {
          clientId: patientId,
          date: input.date,
          reason: input.reason,
          symptoms: input.symptoms ?? null,
          areas: input.areas ?? null,
          treatment: input.treatment ?? null,
          observations: input.observations ?? null,
          nextSession: input.nextSession ?? null,
          tenantId: appReq.tenantId,
        },
      });

      res.status(201).json(ok(record));
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /patients/:patientId/records/:id ─────────────────────────────────────

router.put(
  '/:id',
  validate({ body: updatePatientRecordSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const patientId = req.params['patientId'] as string;
      const recordId = req.params['id'];
      if (!patientId) throw AppError.badRequest('patientId is required');

      const db = getDb(req);
      await requirePatient(db, patientId, appReq.tenantId);

      const existing = await db.patientRecord.findFirst({
        where: { id: recordId, clientId: patientId, tenantId: appReq.tenantId, deletedAt: null },
      });
      if (!existing) throw AppError.notFound('Patient record');

      const input = req.body as Partial<{
        date: string;
        reason: string;
        symptoms: string;
        areas: string;
        treatment: string;
        observations: string;
        nextSession: string;
      }>;

      const updated = await db.patientRecord.update({
        where: { id: existing.id },
        data: {
          ...(input.date !== undefined && { date: input.date }),
          ...(input.reason !== undefined && { reason: input.reason }),
          ...(input.symptoms !== undefined && { symptoms: input.symptoms }),
          ...(input.areas !== undefined && { areas: input.areas }),
          ...(input.treatment !== undefined && { treatment: input.treatment }),
          ...(input.observations !== undefined && { observations: input.observations }),
          ...(input.nextSession !== undefined && { nextSession: input.nextSession }),
        },
      });

      res.json(ok(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /patients/:patientId/records/:id ──────────────────────────────────

router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const patientId = req.params['patientId'] as string;
      const recordId = req.params['id'];
      if (!patientId) throw AppError.badRequest('patientId is required');

      const db = getDb(req);
      await requirePatient(db, patientId, appReq.tenantId);

      const existing = await db.patientRecord.findFirst({
        where: { id: recordId, clientId: patientId, tenantId: appReq.tenantId, deletedAt: null },
      });
      if (!existing) throw AppError.notFound('Patient record');

      await db.patientRecord.update({
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
