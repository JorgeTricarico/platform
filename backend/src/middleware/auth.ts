import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  business: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AppError('JWT_SECRET not configured', 500, false);
  return secret;
}

export function isAuthRequired(): boolean {
  return process.env.REQUIRE_AUTH === 'true';
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // Bypass: if REQUIRE_AUTH !== 'true', let all requests through
  if (!isAuthRequired()) {
    req.user = { userId: 'anonymous', email: 'anonymous', role: 'admin', business: 'all' };
    next();
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalido o expirado' });
  }
}

export function requireBusiness(business: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Token requerido' });
      return;
    }
    if (user.business !== 'all' && user.business !== business) {
      res.status(403).json({ error: 'No tenes acceso a este negocio' });
      return;
    }
    next();
  };
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}
