import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

// --- Limites de truncado ---
const MAX_MESSAGE = 1000;
const MAX_STACK = 5000;
const MAX_URL = 500;
const MAX_USER_AGENT = 500;
const MAX_USER_NAME = 200;

// --- Schemas ---
const errorSourceEnum = z.enum(['frontend', 'backend']);
const errorLevelEnum = z.enum(['error', 'warning']);

const createErrorSchema = z.object({
  source: errorSourceEnum,
  level: errorLevelEnum,
  message: z.string().min(1, 'message es requerido'),
  business: z.string().optional().nullable(),
  stack: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  userName: z.string().optional().nullable(),
  metadata: z.unknown().optional().nullable(),
});

const updateErrorSchema = z.object({
  resolved: z.boolean(),
});

// --- Rate limit in-memory: 50 req/min por IP ---
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 50;
const ipBuckets: Map<string, number[]> = new Map();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ip) ?? [];
  // Filtrar timestamps fuera de la ventana
  const fresh = bucket.filter((ts) => now - ts < RATE_WINDOW_MS);
  if (fresh.length >= RATE_MAX) {
    ipBuckets.set(ip, fresh);
    return false;
  }
  fresh.push(now);
  ipBuckets.set(ip, fresh);
  return true;
}

// Exportado para tests (resetear estado entre runs)
export function _resetRateLimitForTests(): void {
  ipBuckets.clear();
}

function truncate(value: string | null | undefined, max: number): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  return value.length > max ? value.slice(0, max) : value;
}

function getClientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

const router = Router();

// ============================================================
// POST /api/errors  — Publico (sin auth)
// ============================================================

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const ip = getClientIp(req);

  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Demasiados errores reportados. Esperá un minuto.' });
    return;
  }

  const result = createErrorSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Datos invalidos',
      details: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  const data = result.data;

  const message = truncate(data.message, MAX_MESSAGE)!;
  const stack = truncate(data.stack, MAX_STACK);
  const url = truncate(data.url, MAX_URL);
  const userAgent = truncate(data.userAgent, MAX_USER_AGENT);
  const userName = truncate(data.userName, MAX_USER_NAME);

  // Log a stdout para visibilidad inmediata en Render
  console.error('[FRONTEND ERROR]', {
    business: data.business,
    source: data.source,
    level: data.level,
    message,
    url,
    userName,
  });

  const created = await prisma.errorLog.create({
    data: {
      source: data.source,
      level: data.level,
      message,
      business: data.business ?? null,
      stack: stack ?? null,
      url: url ?? null,
      userAgent: userAgent ?? null,
      userName: userName ?? null,
      metadata: (data.metadata ?? null) as never,
    },
  });

  res.status(201).json({ id: created.id });
}));

// ============================================================
// GET /api/errors  — Auditoria (con auth JWT)
// ============================================================

router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const limitRaw = parseInt((req.query.limit as string) ?? '50', 10);
  const offsetRaw = parseInt((req.query.offset as string) ?? '0', 10);
  const limit = Math.min(Math.max(isNaN(limitRaw) ? 50 : limitRaw, 1), 200);
  const offset = Math.max(isNaN(offsetRaw) ? 0 : offsetRaw, 0);

  const where: Record<string, unknown> = {};
  if (typeof req.query.business === 'string' && req.query.business.length > 0) {
    where.business = req.query.business;
  }
  if (typeof req.query.source === 'string' && req.query.source.length > 0) {
    where.source = req.query.source;
  }
  if (typeof req.query.resolved === 'string') {
    where.resolved = req.query.resolved === 'true';
  }

  const errors = await prisma.errorLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  res.json(errors);
}));

// ============================================================
// PATCH /api/errors/:id  — Toggle resolved (con auth)
// ============================================================

router.patch('/:id', authenticate, asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.id as string;

  const result = updateErrorSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Datos invalidos',
      details: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  const existing = await prisma.errorLog.findUnique({ where: { id } });
  if (!existing) {
    return next(new NotFoundError('Error no encontrado'));
  }

  const updated = await prisma.errorLog.update({
    where: { id },
    data: { resolved: result.data.resolved },
  });

  res.json(updated);
}));

export { router as errorsRoutes };
