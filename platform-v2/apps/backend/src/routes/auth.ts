import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { AppError, ok, type AppRequest } from '../types.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  TOKEN_TTL_SECONDS,
} from '../middleware/auth.js';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
} from '../schemas.js';

const router = Router();

// ─── Type for the DB client attached to req ───────────────────────────────────

interface DbUser {
  id: string;
  name: string;
  email: string | null;
  passwordHash: string;
  role: 'admin' | 'viewer';
  tenantId: string;
  deletedAt: Date | null;
}

function getDb(req: Request) {
  const db = (req as unknown as { db: { user: {
    findFirst: (args: unknown) => Promise<DbUser | null>;
    create: (args: unknown) => Promise<DbUser>;
    findUniqueOrThrow: (args: unknown) => Promise<DbUser>;
  } } }).db;
  if (!db) throw AppError.internal('Database not attached to request');
  return db;
}

// ─── GET /auth/status ─────────────────────────────────────────────────────────

router.get('/status', (_req, res) => {
  res.json({ authRequired: true, healthy: true });
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────

router.post(
  '/login',
  validate({ body: loginSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const { name, password } = req.body as { name: string; password: string };
      const db = getDb(req);

      const user = await db.user.findFirst({
        where: {
          name,
          tenantId: appReq.tenantId,
          deletedAt: null,
        },
      });

      if (!user) {
        throw AppError.unauthorized('Invalid credentials');
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        throw AppError.unauthorized('Invalid credentials');
      }

      const accessToken = signAccessToken({
        sub: user.id,
        name: user.name,
        email: user.email ?? '',
        role: user.role,
        tid: user.tenantId,
      });

      const refreshToken = signRefreshToken(user.id, user.tenantId);

      res.json(
        ok({
          token: accessToken,
          refreshToken,
          expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
          },
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /auth/register ──────────────────────────────────────────────────────

router.post(
  '/register',
  validate({ body: registerSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const { name, email, password, role } = req.body as {
        name: string;
        email?: string;
        password: string;
        role: 'admin' | 'viewer';
      };
      const db = getDb(req);

      // Check for duplicate name in tenant
      const existing = await db.user.findFirst({
        where: { name, tenantId: appReq.tenantId, deletedAt: null },
      });
      if (existing) {
        throw AppError.conflict(`A user named "${name}" already exists in this tenant`);
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await db.user.create({
        data: {
          name,
          email: email ?? null,
          passwordHash,
          role,
          tenantId: appReq.tenantId,
        },
      });

      const accessToken = signAccessToken({
        sub: user.id,
        name: user.name,
        email: user.email ?? '',
        role: user.role,
        tid: user.tenantId,
      });

      const refreshToken = signRefreshToken(user.id, user.tenantId);

      res.status(201).json(
        ok({
          token: accessToken,
          refreshToken,
          expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
          },
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

router.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appReq = req as AppRequest;
      const { refreshToken } = req.body as { refreshToken: string };
      const db = getDb(req);

      const { sub, tid } = verifyRefreshToken(refreshToken);

      // Validate tenant matches
      if (tid !== appReq.tenantId) {
        throw AppError.forbidden('Token does not belong to this tenant');
      }

      const user = await db.user.findUniqueOrThrow({ where: { id: sub } });

      const accessToken = signAccessToken({
        sub: user.id,
        name: user.name,
        email: user.email ?? '',
        role: user.role,
        tid: user.tenantId,
      });

      res.json(
        ok({
          token: accessToken,
          expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000,
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

router.get(
  '/me',
  requireAuth(),
  (req: Request, res: Response): void => {
    const appReq = req as AppRequest;
    res.json(
      ok({
        id: appReq.user!.id,
        name: appReq.user!.name,
        email: appReq.user!.email,
        role: appReq.user!.role,
        tenantId: appReq.user!.tenantId,
      }),
    );
  },
);

export default router;
