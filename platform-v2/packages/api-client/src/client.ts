/**
 * createApiClient — factory that returns a typed, tenant-aware API client.
 *
 * Features:
 * - Automatic JWT Bearer header injection
 * - Auto-refresh when token is expiring soon
 * - Offline mutation queue (falls back to IndexedDB when offline)
 * - Read-through cache with TTL
 * - Retry on 5xx with exponential back-off (max 3 attempts)
 */
import type { PaginatedResponse } from '@platform/types';
import { ApiError } from '@platform/types';
import {
  getToken,
  isTokenExpiringSoon,
  refreshTokenRequest,
} from './auth.js';
import { cachedFetch, invalidateCache } from './cache.js';
import { queueMutation } from './sync.js';

export interface ApiClientOptions {
  baseUrl: string;
  tenantSlug: string;
  /** Maximum number of retry attempts for 5xx errors. Default: 3 */
  maxRetries?: number;
  /** Base delay in ms for exponential back-off. Default: 500 */
  retryDelay?: number;
  /** Default cache TTL in ms. Default: 5 minutes */
  cacheTtlMs?: number;
}

export interface RequestOptions {
  /** Skip the cache for this request */
  noCache?: boolean;
  /** Override cache TTL for this request */
  cacheTtlMs?: number;
  /** Additional headers */
  headers?: Record<string, string>;
  /** If true, queue the mutation when offline instead of throwing */
  queueOffline?: boolean;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createApiClient(options: ApiClientOptions) {
  const {
    baseUrl,
    tenantSlug,
    maxRetries = 3,
    retryDelay = 500,
    cacheTtlMs = 5 * 60 * 1000,
  } = options;

  const apiBase = `${baseUrl}/api/${tenantSlug}`;

  async function buildHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
    const headers: Record<string, string> = { ...extra };

    // Auto-refresh token if expiring soon
    if (isTokenExpiringSoon()) {
      await refreshTokenRequest(baseUrl, tenantSlug);
    }

    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return headers;
  }

  async function fetchWithRetry(
    url: string,
    init: RequestInit,
    attempt = 1,
  ): Promise<Response> {
    const res = await fetch(url, init);

    // Retry on 5xx with exponential back-off
    if (res.status >= 500 && attempt < maxRetries) {
      await sleep(retryDelay * Math.pow(2, attempt - 1));
      return fetchWithRetry(url, init, attempt + 1);
    }

    return res;
  }

  async function parseResponse<T>(res: Response): Promise<T> {
    const body = await res.json().catch(() => null) as unknown;
    if (!res.ok) {
      const err = body as { error?: string; code?: string; details?: unknown } | null;
      throw new ApiError(
        res.status,
        err?.error ?? `HTTP ${res.status}`,
        err?.code,
        err?.details,
      );
    }
    return body as T;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  async function get<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const url = `${apiBase}${path}`;
    const headers = await buildHeaders(opts.headers);
    const ttl = opts.cacheTtlMs ?? cacheTtlMs;

    if (opts.noCache) {
      const res = await fetchWithRetry(url, { headers });
      return parseResponse<T>(res);
    }

    return cachedFetch<T>(tenantSlug, url, { headers }, ttl);
  }

  async function mutate<T>(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    opts: RequestOptions = {},
  ): Promise<T> {
    const url = `${apiBase}${path}`;

    try {
      const headers = await buildHeaders({
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...opts.headers,
      });

      const res = await fetchWithRetry(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      // Invalidate related cache entries after a successful mutation
      await invalidateCache(tenantSlug, `${apiBase}${path.split('/')[0] ?? ''}`);

      return parseResponse<T>(res);
    } catch (err) {
      // Queue offline if requested and navigator is offline
      if (opts.queueOffline && !navigator.onLine) {
        await queueMutation(tenantSlug, {
          url,
          method,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        // Return a synthetic "queued" response
        return { queued: true, offline: true } as unknown as T;
      }
      throw err;
    }
  }

  async function post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return mutate<T>('POST', path, body, opts);
  }

  async function put<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return mutate<T>('PUT', path, body, opts);
  }

  async function patch<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return mutate<T>('PATCH', path, body, opts);
  }

  async function del<T>(path: string, opts?: RequestOptions): Promise<T> {
    return mutate<T>('DELETE', path, undefined, opts);
  }

  async function getPaginated<T>(
    path: string,
    params: { page?: number; pageSize?: number; [key: string]: unknown } = {},
    opts: RequestOptions = {},
  ): Promise<PaginatedResponse<T>> {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) query.set(k, String(v));
    }
    const fullPath = query.toString() ? `${path}?${query.toString()}` : path;
    return get<PaginatedResponse<T>>(fullPath, opts);
  }

  return { get, post, put, patch, del, getPaginated, apiBase };
}

export type ApiClient = ReturnType<typeof createApiClient>;
