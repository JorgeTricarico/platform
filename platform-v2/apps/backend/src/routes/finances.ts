import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AppError, ok, paginatedOk, type AppRequest } from '../types.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { buildPaginatedResponse, decodeCursor } from '../middleware/pagination.js';
import {
  createFinanceSchema,
  updateFinanceSchema,
  listFinancesSchema,
  financeSummarySchema,
  uuidSchema,
} from '../schemas.js';

const router = Router();

router.use(requireAuth());

// ─── DB Helper ────────────────────────────────────────────────────────────────

interface DbFinance {
  id: string;
  date: string;
  type: 'ingreso' | 'gasto';
  category: string;
  amount: number;
  description: string;
  paymentMethod: string;
  referenceId: string | null;
  referenceType: string;
  tenantId: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AggregateResult {
  _sum: { amount: number | null };
}

function getDb(req: Request) {
  const db = (req as unknown as { db: {
    finance: {
      findMany: (args: unknown) => Promise<DbFinance[]>;
      findFirst: (args: unknown) => Promise<DbFinance | null>;
      create: (args: unknown) => Promise<DbFinance>;
      update: (args: unknown) => Promise<DbFinance>;
      count: (args: unknown) => Promise<number>;
      aggregate: (args: unknown) => Promise<AggregateResult>;
      groupBy: (args: unknown) => Promise<Array<{ category: string; _sum: { amount: number | null } }>>;
    }
  } }).db;
  if (!db) throw AppError.internal('Database not attached to request');
  return db;
}

// ─── GET /finances ────────────────────────────────────────────────────────────

router.get(
  '/',
  validate({ query: listFinancesSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const {
        cursor,
        limit,
        q,
        sortBy,
        sortDir,
        type,
        category,
        from,
        to,
        month,
      } = req.query as {
        cursor?: string;
        limit: number;
        q?: string;
        sortBy?: string;
        sortDir: 'asc' | 'desc';
        type?: 'ingreso' | 'gasto';
        category?: string;
        from?: string;
        to?: string;
        month?: string;
      };
      const db = getDb(req);

      // Month shortcut: expand to date range
      let dateFrom = from;
      let dateTo = to;
      if (month) {
        dateFrom = `${month}-01`;
        const [year, mon] = month.split('-').map(Number);
        const lastDay = new Date((year ?? 2000), (mon ?? 1), 0).getDate();
        dateTo = `${month}-${String(lastDay).padStart(2, '0')}`;
      }

      const where: Record<string, unknown> = {
        tenantId: appReq.tenantId,
        deletedAt: null,
        ...(type && { type }),
        ...(category && { category: { contains: category, mode: 'insensitive' } }),
        ...(dateFrom || dateTo
          ? {
              date: {
                ...(dateFrom && { gte: dateFrom }),
                ...(dateTo && { lte: dateTo }),
              },
            }
          : {}),
        ...(q
          ? {
              OR: [
                { description: { contains: q, mode: 'insensitive' } },
                { category: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      };

      const validSortFields = ['date', 'amount', 'category', 'createdAt'];
      const orderByField = validSortFields.includes(sortBy ?? '') ? sortBy! : 'date';
      const orderBy = { [orderByField]: sortDir ?? 'desc' };

      const cursorId = cursor ? decodeCursor(cursor) : undefined;
      const cursorClause = cursorId ? { cursor: { id: cursorId }, skip: 1 } : {};

      const [items, total] = await Promise.all([
        db.finance.findMany({
          where,
          orderBy,
          take: (limit as number) + 1,
          ...cursorClause,
        }),
        db.finance.count({ where }),
      ]);

      const paginated = buildPaginatedResponse(items, limit as number, (f) => f.id);
      res.json(paginatedOk(paginated.items, paginated.cursor, paginated.hasMore, total));
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /finances/summary ────────────────────────────────────────────────────

router.get(
  '/summary',
  validate({ query: financeSummarySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const { month, year } = req.query as { month?: string; year?: string };
      const db = getDb(req);

      // Determine date range
      let dateFrom: string;
      let dateTo: string;

      if (month) {
        dateFrom = `${month}-01`;
        const [y, m] = month.split('-').map(Number);
        const lastDay = new Date((y ?? 2000), (m ?? 1), 0).getDate();
        dateTo = `${month}-${String(lastDay).padStart(2, '0')}`;
      } else if (year) {
        dateFrom = `${year}-01-01`;
        dateTo = `${year}-12-31`;
      } else {
        // Default to current month
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        dateFrom = `${y}-${m}-01`;
        const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
        dateTo = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
      }

      const baseWhere = {
        tenantId: appReq.tenantId,
        deletedAt: null,
        date: { gte: dateFrom, lte: dateTo },
      };

      const [incomeResult, expenseResult, byCategory] = await Promise.all([
        db.finance.aggregate({
          where: { ...baseWhere, type: 'ingreso' },
          _sum: { amount: true },
        }),
        db.finance.aggregate({
          where: { ...baseWhere, type: 'gasto' },
          _sum: { amount: true },
        }),
        db.finance.groupBy({
          by: ['category'],
          where: baseWhere,
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
        }),
      ]);

      const totalIncome = incomeResult._sum.amount ?? 0;
      const totalExpenses = expenseResult._sum.amount ?? 0;
      const net = totalIncome - totalExpenses;

      res.json(
        ok({
          period: { from: dateFrom, to: dateTo },
          totalIncome,
          totalExpenses,
          net,
          byCategory: byCategory.map((row) => ({
            category: row.category,
            amount: row._sum.amount ?? 0,
          })),
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /finances/:id ────────────────────────────────────────────────────────

router.get(
  '/:id',
  validate({ params: uuidSchema.transform((id) => ({ id })) }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const db = getDb(req);

      const finance = await db.finance.findFirst({
        where: { id: req.params['id'], tenantId: appReq.tenantId, deletedAt: null },
      });

      if (!finance) throw AppError.notFound('Finance entry');
      res.json(ok(finance));
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /finances ───────────────────────────────────────────────────────────

router.post(
  '/',
  validate({ body: createFinanceSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const input = req.body as {
        date: string;
        type: 'ingreso' | 'gasto';
        category: string;
        amount: number;
        description: string;
        paymentMethod: string;
        referenceId?: string;
        referenceType: string;
      };
      const db = getDb(req);

      const finance = await db.finance.create({
        data: {
          date: input.date,
          type: input.type,
          category: input.category,
          amount: input.amount,
          description: input.description,
          paymentMethod: input.paymentMethod,
          referenceId: input.referenceId ?? null,
          referenceType: input.referenceType,
          tenantId: appReq.tenantId,
        },
      });

      res.status(201).json(ok(finance));
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /finances/:id ────────────────────────────────────────────────────────

router.put(
  '/:id',
  validate({ body: updateFinanceSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const db = getDb(req);

      const existing = await db.finance.findFirst({
        where: { id: req.params['id'], tenantId: appReq.tenantId, deletedAt: null },
      });
      if (!existing) throw AppError.notFound('Finance entry');

      const input = req.body as Partial<{
        date: string;
        type: 'ingreso' | 'gasto';
        category: string;
        amount: number;
        description: string;
        paymentMethod: string;
        referenceId: string;
        referenceType: string;
      }>;

      const updated = await db.finance.update({
        where: { id: existing.id },
        data: {
          ...(input.date !== undefined && { date: input.date }),
          ...(input.type !== undefined && { type: input.type }),
          ...(input.category !== undefined && { category: input.category }),
          ...(input.amount !== undefined && { amount: input.amount }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.paymentMethod !== undefined && { paymentMethod: input.paymentMethod }),
          ...(input.referenceId !== undefined && { referenceId: input.referenceId }),
          ...(input.referenceType !== undefined && { referenceType: input.referenceType }),
        },
      });

      res.json(ok(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /finances/:id ─────────────────────────────────────────────────────

router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const db = getDb(req);

      const existing = await db.finance.findFirst({
        where: { id: req.params['id'], tenantId: appReq.tenantId, deletedAt: null },
      });
      if (!existing) throw AppError.notFound('Finance entry');

      await db.finance.update({
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
