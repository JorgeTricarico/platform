import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../types.js';

// ─── Request Logger ───────────────────────────────────────────────────────────

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, url } = req;
  const tenantId = (req as { tenantId?: string }).tenantId ?? '-';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(
      `[${level}] ${method} ${url} ${res.statusCode} ${duration}ms tenant=${tenantId}`,
    );
  });

  next();
}

// ─── 404 Handler ─────────────────────────────────────────────────────────────

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route ${req.method} ${req.path}`));
}

// ─── Central Error Handler ────────────────────────────────────────────────────

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      ok: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  // App-level errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      console.error('[AppError]', err.message, err.stack);
    }
    res.status(err.statusCode).json({
      ok: false,
      error: err.message,
      code: err.code,
      ...(err.details !== undefined && { details: err.details }),
    });
    return;
  }

  // JWT errors
  if (err instanceof Error && err.name === 'JsonWebTokenError') {
    res.status(401).json({
      ok: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
    return;
  }

  if (err instanceof Error && err.name === 'TokenExpiredError') {
    res.status(401).json({
      ok: false,
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
    });
    return;
  }

  // Unexpected errors
  console.error('[UnhandledError]', err);
  res.status(500).json({
    ok: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
