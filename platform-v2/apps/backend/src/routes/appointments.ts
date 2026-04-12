import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AppError, ok, paginatedOk, type AppRequest } from '../types.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { buildPaginatedResponse, decodeCursor } from '../middleware/pagination.js';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  patchAppointmentStatusSchema,
  listAppointmentsSchema,
  uuidSchema,
} from '../schemas.js';

const router = Router();

router.use(requireAuth());

// ─── DB Helper ────────────────────────────────────────────────────────────────

interface DbAppointment {
  id: string;
  clientId: string;
  service: string;
  duration: number;
  date: string;
  time: string;
  status: string;
  cancellationReason: string | null;
  price: number;
  notes: string | null;
  location: string;
  therapistId: string | null;
  tenantId: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  client?: { id: string; name: string; phone: string };
}

function getDb(req: Request) {
  const db = (req as unknown as { db: {
    appointment: {
      findMany: (args: unknown) => Promise<DbAppointment[]>;
      findFirst: (args: unknown) => Promise<DbAppointment | null>;
      create: (args: unknown) => Promise<DbAppointment>;
      update: (args: unknown) => Promise<DbAppointment>;
      count: (args: unknown) => Promise<number>;
    }
  } }).db;
  if (!db) throw AppError.internal('Database not attached to request');
  return db;
}

// ─── Conflict detection helper ────────────────────────────────────────────────

async function detectConflict(
  db: ReturnType<typeof getDb>,
  tenantId: string,
  date: string,
  time: string,
  duration: number,
  therapistId?: string,
  excludeId?: string,
): Promise<boolean> {
  if (!therapistId) return false;

  // Parse start/end in minutes from midnight
  const [startHour = 0, startMin = 0] = time.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = startMinutes + duration;

  const existing = await db.appointment.findMany({
    where: {
      tenantId,
      date,
      therapistId,
      status: { notIn: ['cancelado'] },
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  for (const appt of existing) {
    const [aHour = 0, aMin = 0] = appt.time.split(':').map(Number);
    const aStart = aHour * 60 + aMin;
    const aEnd = aStart + appt.duration;
    // Overlap: not (endMinutes <= aStart || startMinutes >= aEnd)
    if (!(endMinutes <= aStart || startMinutes >= aEnd)) {
      return true;
    }
  }
  return false;
}

// ─── GET /appointments ────────────────────────────────────────────────────────

router.get(
  '/',
  validate({ query: listAppointmentsSchema }),
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
        upcoming,
        past,
        clientId,
        therapistId,
        from,
        to,
      } = req.query as unknown as {
        cursor?: string;
        limit: number;
        q?: string;
        sortBy?: string;
        sortDir: 'asc' | 'desc';
        status?: string;
        upcoming: boolean;
        past: boolean;
        clientId?: string;
        therapistId?: string;
        from?: string;
        to?: string;
      };
      const db = getDb(req);

      const today = new Date().toISOString().slice(0, 10);

      const where: Record<string, unknown> = {
        tenantId: appReq.tenantId,
        deletedAt: null,
        ...(status && { status }),
        ...(clientId && { clientId }),
        ...(therapistId && { therapistId }),
        ...(upcoming && { date: { gte: today } }),
        ...(past && { date: { lt: today } }),
        ...(from || to
          ? {
              date: {
                ...(from && { gte: from }),
                ...(to && { lte: to }),
              },
            }
          : {}),
        ...(q
          ? {
              OR: [
                { service: { contains: q, mode: 'insensitive' } },
                { client: { name: { contains: q, mode: 'insensitive' } } },
                { client: { phone: { contains: q } } },
              ],
            }
          : {}),
      };

      const validSortFields = ['date', 'time', 'createdAt', 'price'];
      const orderByField = validSortFields.includes(sortBy ?? '') ? sortBy! : 'date';
      const orderBy = [{ [orderByField]: sortDir ?? 'desc' }, { time: sortDir ?? 'desc' }];

      const cursorId = cursor ? decodeCursor(cursor) : undefined;
      const cursorClause = cursorId ? { cursor: { id: cursorId }, skip: 1 } : {};

      const [items, total] = await Promise.all([
        db.appointment.findMany({
          where,
          orderBy,
          take: (limit as number) + 1,
          ...cursorClause,
          include: { client: { select: { id: true, name: true, phone: true } } },
        }),
        db.appointment.count({ where }),
      ]);

      const paginated = buildPaginatedResponse(items, limit as number, (a) => a.id);
      res.json(paginatedOk(paginated.items, paginated.cursor, paginated.hasMore, total));
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /appointments/:id ────────────────────────────────────────────────────

router.get(
  '/:id',
  validate({ params: uuidSchema.transform((id) => ({ id })) }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const db = getDb(req);

      const appointment = await db.appointment.findFirst({
        where: { id: req.params['id'], tenantId: appReq.tenantId, deletedAt: null },
        include: { client: { select: { id: true, name: true, phone: true } } },
      });

      if (!appointment) throw AppError.notFound('Appointment');
      res.json(ok(appointment));
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /appointments ───────────────────────────────────────────────────────

router.post(
  '/',
  validate({ body: createAppointmentSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const input = req.body as {
        clientId: string;
        service: string;
        duration: number;
        date: string;
        time: string;
        status: string;
        price: number;
        notes?: string;
        location: string;
        therapistId?: string;
      };
      const db = getDb(req);

      const conflict = await detectConflict(
        db,
        appReq.tenantId,
        input.date,
        input.time,
        input.duration,
        input.therapistId,
      );
      if (conflict) {
        throw AppError.conflict(
          'This therapist already has an appointment that overlaps with the requested time',
        );
      }

      const appointment = await db.appointment.create({
        data: {
          clientId: input.clientId,
          service: input.service,
          duration: input.duration,
          date: input.date,
          time: input.time,
          status: input.status,
          price: input.price,
          notes: input.notes ?? null,
          location: input.location,
          therapistId: input.therapistId ?? null,
          tenantId: appReq.tenantId,
        },
        include: { client: { select: { id: true, name: true, phone: true } } },
      });

      res.status(201).json(ok(appointment));
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /appointments/:id ────────────────────────────────────────────────────

router.put(
  '/:id',
  validate({ body: updateAppointmentSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const db = getDb(req);

      const existing = await db.appointment.findFirst({
        where: { id: req.params['id'], tenantId: appReq.tenantId, deletedAt: null },
      });
      if (!existing) throw AppError.notFound('Appointment');

      const input = req.body as Partial<{
        service: string;
        duration: number;
        date: string;
        time: string;
        status: string;
        price: number;
        notes: string;
        location: string;
        therapistId: string;
      }>;

      // Re-check conflict if date/time/duration/therapist changes
      const newDate = input.date ?? existing.date;
      const newTime = input.time ?? existing.time;
      const newDuration = input.duration ?? existing.duration;
      const newTherapist = input.therapistId ?? existing.therapistId ?? undefined;

      if (
        input.date !== undefined ||
        input.time !== undefined ||
        input.duration !== undefined ||
        input.therapistId !== undefined
      ) {
        const conflict = await detectConflict(
          db,
          appReq.tenantId,
          newDate,
          newTime,
          newDuration,
          newTherapist,
          existing.id,
        );
        if (conflict) {
          throw AppError.conflict('Updated time overlaps with another appointment for this therapist');
        }
      }

      const updated = await db.appointment.update({
        where: { id: existing.id },
        data: {
          ...(input.service !== undefined && { service: input.service }),
          ...(input.duration !== undefined && { duration: input.duration }),
          ...(input.date !== undefined && { date: input.date }),
          ...(input.time !== undefined && { time: input.time }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.price !== undefined && { price: input.price }),
          ...(input.notes !== undefined && { notes: input.notes }),
          ...(input.location !== undefined && { location: input.location }),
          ...(input.therapistId !== undefined && { therapistId: input.therapistId }),
        },
        include: { client: { select: { id: true, name: true, phone: true } } },
      });

      res.json(ok(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /appointments/:id/status ──────────────────────────────────────────

router.patch(
  '/:id/status',
  validate({ body: patchAppointmentStatusSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const db = getDb(req);
      const { status, cancellationReason } = req.body as {
        status: string;
        cancellationReason?: string;
      };

      const existing = await db.appointment.findFirst({
        where: { id: req.params['id'], tenantId: appReq.tenantId, deletedAt: null },
      });
      if (!existing) throw AppError.notFound('Appointment');

      const updated = await db.appointment.update({
        where: { id: existing.id },
        data: {
          status,
          ...(status === 'cancelado' && cancellationReason !== undefined && {
            cancellationReason,
          }),
        },
      });

      res.json(ok(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /appointments/:id ─────────────────────────────────────────────────

router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const db = getDb(req);

      const existing = await db.appointment.findFirst({
        where: { id: req.params['id'], tenantId: appReq.tenantId, deletedAt: null },
      });
      if (!existing) throw AppError.notFound('Appointment');

      await db.appointment.update({
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
