import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { AppRequest, PaginatedData } from '../types.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Extracts cursor-based pagination params from query string.
 * Attaches { cursor, limit } to req.pagination.
 *
 * Query params:
 *   cursor  — opaque base64-encoded cursor string (optional)
 *   limit   — page size, 1–100, defaults to 20
 */
export function paginationMiddleware(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const appReq = req as AppRequest;

    const rawLimit = req.query['limit'];
    let limit = DEFAULT_LIMIT;
    if (typeof rawLimit === 'string') {
      const parsed = parseInt(rawLimit, 10);
      if (!isNaN(parsed)) {
        limit = Math.min(Math.max(1, parsed), MAX_LIMIT);
      }
    }

    const rawCursor = req.query['cursor'];
    const cursor =
      typeof rawCursor === 'string' && rawCursor.trim() ? rawCursor.trim() : undefined;

    appReq.pagination = { cursor, limit };
    next();
  };
}

// ─── Cursor Encoding Helpers ──────────────────────────────────────────────────

/** Encode a Prisma cursor value (typically an ID) to a base64 string. */
export function encodeCursor(id: string): string {
  return Buffer.from(id, 'utf-8').toString('base64url');
}

/** Decode a base64 cursor back to the original ID. Returns null on invalid input. */
export function decodeCursor(cursor: string): string | null {
  try {
    return Buffer.from(cursor, 'base64url').toString('utf-8');
  } catch {
    return null;
  }
}

/**
 * Build a standardised paginated response payload.
 *
 * @param items  - the fetched items (may have one extra to detect hasMore)
 * @param limit  - the requested page size
 * @param getId  - function to extract the cursor key from an item
 */
export function buildPaginatedResponse<T>(
  items: T[],
  limit: number,
  getId: (item: T) => string,
): PaginatedData<T> {
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  const lastItem = page[page.length - 1];
  const cursor = hasMore && lastItem ? encodeCursor(getId(lastItem)) : null;
  return { items: page, cursor, hasMore };
}
