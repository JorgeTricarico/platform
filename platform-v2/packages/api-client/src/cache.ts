/**
 * IndexedDB-based API cache with TTL support.
 * Each tenant gets its own DB so data is fully isolated.
 */

const CACHE_STORE = 'api_cache';
const DB_VERSION = 1;

// Default TTL: 5 minutes
const DEFAULT_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  url: string;
  data: T;
  timestamp: number;
  ttl: number;
}

function openDB(tenantSlug: string): Promise<IDBDatabase> {
  const DB_NAME = `platform_${tenantSlug}_cache`;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'url' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedData<T>(
  tenantSlug: string,
  url: string,
): Promise<T | null> {
  try {
    const db = await openDB(tenantSlug);
    return new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE, 'readonly');
      const store = tx.objectStore(CACHE_STORE);
      const req = store.get(url);
      req.onsuccess = () => {
        const entry = req.result as CacheEntry<T> | undefined;
        if (!entry) return resolve(null);
        // Check TTL
        if (Date.now() - entry.timestamp > entry.ttl) return resolve(null);
        resolve(entry.data);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedData(
  tenantSlug: string,
  url: string,
  data: unknown,
  ttlMs = DEFAULT_TTL_MS,
): Promise<void> {
  try {
    const db = await openDB(tenantSlug);
    const tx = db.transaction(CACHE_STORE, 'readwrite');
    const store = tx.objectStore(CACHE_STORE);
    store.put({ url, data, timestamp: Date.now(), ttl: ttlMs } satisfies CacheEntry<unknown>);
  } catch {
    /* silently fail — cache is best-effort */
  }
}

export async function invalidateCache(tenantSlug: string, urlPrefix?: string): Promise<void> {
  try {
    const db = await openDB(tenantSlug);
    return new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE, 'readwrite');
      const store = tx.objectStore(CACHE_STORE);
      if (!urlPrefix) {
        store.clear();
        tx.oncomplete = () => resolve();
        return;
      }
      // Only delete keys matching the prefix
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        if ((cursor.key as string).startsWith(urlPrefix)) {
          cursor.delete();
        }
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
    });
  } catch {
    /* silently fail */
  }
}

/**
 * High-level wrapper: try fetch, on failure fall back to cache.
 * On success, updates the cache entry.
 */
export async function cachedFetch<T>(
  tenantSlug: string,
  url: string,
  init: RequestInit = {},
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as T;
    await setCachedData(tenantSlug, url, data, ttlMs);
    return data;
  } catch (err) {
    const cached = await getCachedData<T>(tenantSlug, url);
    if (cached !== null) return cached;
    throw err;
  }
}
