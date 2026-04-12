import type { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { AppError, type AppRequest, type JwtPayload } from '../types.js';

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production';

// ─── Token Verification ───────────────────────────────────────────────────────

function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

// ─── requireAuth ─────────────────────────────────────────────────────────────
// Enforces authentication. Sets req.user. Returns 401 if missing/invalid.
// Validates that the token's tenant claim matches the resolved tenant.

export function requireAuth(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const token = extractToken(req);
      if (!token) {
        throw AppError.unauthorized('Authentication required');
      }

      const payload = verifyAccessToken(token);
      const appReq = req as AppRequest;

      // If tenant middleware ran, validate tenant claim matches
      if (appReq.tenantId && payload.tid !== appReq.tenantId) {
        throw AppError.forbidden('Token does not belong to this tenant');
      }

      appReq.user = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tid,
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}

// ─── optionalAuth ─────────────────────────────────────────────────────────────
// Sets req.user if a valid token is present, but does NOT require it.

export function optionalAuth(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const token = extractToken(req);
      if (!token) {
        return next();
      }

      const payload = verifyAccessToken(token);
      const appReq = req as AppRequest;
      appReq.user = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tid,
      };
    } catch {
      // Ignore invalid tokens in optional mode
    }
    next();
  };
}

// ─── requireRole ─────────────────────────────────────────────────────────────
// Must be used AFTER requireAuth().

export function requireRole(role: 'admin' | 'viewer'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const appReq = req as AppRequest;
    if (!appReq.user) {
      return next(AppError.unauthorized());
    }
    if (role === 'admin' && appReq.user.role !== 'admin') {
      return next(AppError.forbidden('Admin role required'));
    }
    next();
  };
}

// ─── Token generation helpers (used by auth route) ────────────────────────────

export const TOKEN_TTL_SECONDS = 60 * 60 * 4; // 4 hours
export const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}

export function signRefreshToken(userId: string, tenantId: string): string {
  return jwt.sign({ sub: userId, tid: tenantId, type: 'refresh' }, JWT_SECRET, {
    expiresIn: REFRESH_TTL_SECONDS,
  });
}

export function verifyRefreshToken(token: string): { sub: string; tid: string } {
  const payload = jwt.verify(token, JWT_SECRET) as {
    sub: string;
    tid: string;
    type: string;
  };
  if (payload.type !== 'refresh') {
    throw AppError.unauthorized('Invalid refresh token type');
  }
  return { sub: payload.sub, tid: payload.tid };
}
