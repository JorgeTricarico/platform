import type { Request } from 'express';
import type { TenantConfig } from '@platform/config';

// ─── Extended Express Request ─────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'viewer';
  tenantId: string;
}

export interface PaginationState {
  cursor: string | undefined;
  limit: number;
}

export interface AppRequest extends Request {
  tenantId: string;
  tenant: TenantConfig;
  user?: AuthUser;
  pagination: PaginationState;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
}

// ─── App Error ────────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(403, message, 'FORBIDDEN');
  }

  static notFound(resource: string): AppError {
    return new AppError(404, `${resource} not found`, 'NOT_FOUND');
  }

  static conflict(message: string): AppError {
    return new AppError(409, message, 'CONFLICT');
  }

  static featureDisabled(feature: string): AppError {
    return new AppError(404, `Feature "${feature}" is not available`, 'FEATURE_DISABLED');
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(500, message, 'INTERNAL_ERROR');
  }
}

// ─── Standard API Response Shapes ────────────────────────────────────────────

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedData<T> {
  items: T[];
  cursor: string | null;
  hasMore: boolean;
  total?: number;
}

export function ok<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function paginatedOk<T>(
  items: T[],
  cursor: string | null,
  hasMore: boolean,
  total?: number,
): ApiSuccess<PaginatedData<T>> {
  return { ok: true, data: { items, cursor, hasMore, total } };
}

// ─── JWT Payload ──────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;       // user id
  name: string;
  email: string;
  role: 'admin' | 'viewer';
  tid: string;       // tenant id (slug)
  iat?: number;
  exp?: number;
}

export interface RefreshPayload {
  sub: string;
  tid: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}
