import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';

// --- Custom Error Classes ---

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database error') {
    super(message, 500, false);
  }
}

// --- Error Handler Middleware ---

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const isDev = process.env.NODE_ENV !== 'production';
  const appErr = err instanceof AppError ? err : null;
  const statusCode = appErr?.statusCode ?? 500;
  const isOperational = appErr?.isOperational ?? false;

  // Always log in prod; in dev the error will show in the response anyway
  if (!isDev) {
    console.error(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${statusCode} ${err.message}\n${err.stack}`,
    );
  }

  // Persistir a error_logs para auditoria sin depender de Render logs.
  // Solo errores 5xx (los 4xx son del cliente, ruido). Fire-and-forget:
  // si la escritura falla, no podemos hacer nada — ya estamos en el handler
  // de error y bloquear la respuesta seria peor que perder el log.
  if (statusCode >= 500) {
    prisma.errorLog.create({
      data: {
        source: 'backend',
        level: 'error',
        message: err.message.slice(0, 1000),
        stack: err.stack?.slice(0, 5000) ?? null,
        url: `${req.method} ${req.originalUrl ?? req.path}`.slice(0, 500),
        userAgent: (req.headers?.['user-agent'] ?? '').toString().slice(0, 500),
      },
    }).catch((logErr) => {
      console.error('[errorHandler] No se pudo persistir error a DB:', logErr);
    });
  }

  if (isDev) {
    res.status(statusCode).json({
      error: err.message,
      statusCode,
      stack: err.stack,
    });
    return;
  }

  // Production: expose message only for operational errors
  res.status(statusCode).json({
    error: isOperational ? err.message : 'Internal server error',
  });
}

// --- Request Logger Middleware ---

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
}

// --- asyncHandler wrapper ---
// Wraps async route handlers so unhandled rejections are forwarded to next()

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
