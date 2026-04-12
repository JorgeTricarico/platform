// ─── Generic API shapes ───────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiErrorBody {
  ok: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function makePaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / pageSize);
  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  name: string;
  password: string;
  business?: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    role: string;
    business: string;
  };
  expiresAt: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  expiresAt: number;
}

// ─── Tenant resolution ────────────────────────────────────────────────────────

export interface TenantResolution {
  slug: string;
  source: 'header' | 'subdomain' | 'env' | 'default';
}

// ─── Offline sync ────────────────────────────────────────────────────────────

export interface PendingMutation {
  id?: number;
  url: string;
  method: string;
  body?: string;
  timestamp: number;
  retries?: number;
}

export interface SyncResult {
  processed: number;
  failed: number;
  errors: Array<{ id: number; error: string }>;
}
