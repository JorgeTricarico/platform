/**
 * Offline mutation queue backed by IndexedDB.
 * When the network is unavailable, mutations are stored locally and
 * replayed automatically when connectivity is restored.
 */
import type { PendingMutation, SyncResult } from '@platform/types';

const MUTATION_STORE = 'pending_mutations';
const DB_VERSION = 1;
const MAX_RETRIES = 3;

function openSyncDB(tenantSlug: string): Promise<IDBDatabase> {
  const DB_NAME = `platform_${tenantSlug}_sync`;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MUTATION_STORE)) {
        db.createObjectStore(MUTATION_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueMutation(
  tenantSlug: string,
  mutation: Omit<PendingMutation, 'id' | 'timestamp' | 'retries'>,
): Promise<void> {
  try {
    const db = await openSyncDB(tenantSlug);
    const tx = db.transaction(MUTATION_STORE, 'readwrite');
    const store = tx.objectStore(MUTATION_STORE);
    store.add({ ...mutation, timestamp: Date.now(), retries: 0 } satisfies Omit<PendingMutation, 'id'>);
  } catch {
    /* silently fail */
  }
}

export async function getPendingMutations(tenantSlug: string): Promise<PendingMutation[]> {
  try {
    const db = await openSyncDB(tenantSlug);
    return new Promise((resolve) => {
      const tx = db.transaction(MUTATION_STORE, 'readonly');
      const store = tx.objectStore(MUTATION_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as PendingMutation[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function clearMutation(tenantSlug: string, id: number): Promise<void> {
  try {
    const db = await openSyncDB(tenantSlug);
    const tx = db.transaction(MUTATION_STORE, 'readwrite');
    const store = tx.objectStore(MUTATION_STORE);
    store.delete(id);
  } catch {
    /* silently fail */
  }
}

export async function incrementRetries(tenantSlug: string, id: number): Promise<void> {
  try {
    const db = await openSyncDB(tenantSlug);
    return new Promise((resolve) => {
      const tx = db.transaction(MUTATION_STORE, 'readwrite');
      const store = tx.objectStore(MUTATION_STORE);
      const req = store.get(id);
      req.onsuccess = () => {
        const entry = req.result as PendingMutation | undefined;
        if (!entry) return resolve();
        store.put({ ...entry, retries: (entry.retries ?? 0) + 1 });
        tx.oncomplete = () => resolve();
      };
      req.onerror = () => resolve();
    });
  } catch {
    /* silently fail */
  }
}

/**
 * Replay all pending mutations.
 * Mutations that succeed are removed. Mutations that fail and have exceeded
 * MAX_RETRIES are also removed to prevent infinite loops.
 */
export async function syncPendingMutations(
  tenantSlug: string,
  authToken: string | null,
): Promise<SyncResult> {
  const mutations = await getPendingMutations(tenantSlug);
  const result: SyncResult = { processed: 0, failed: 0, errors: [] };

  for (const mutation of mutations) {
    if (mutation.id === undefined) continue;
    const retries = mutation.retries ?? 0;

    if (retries >= MAX_RETRIES) {
      // Give up on this mutation
      await clearMutation(tenantSlug, mutation.id);
      result.failed++;
      result.errors.push({ id: mutation.id, error: 'Max retries exceeded' });
      continue;
    }

    try {
      const headers: Record<string, string> = {};
      if (mutation.body) headers['Content-Type'] = 'application/json';
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(mutation.url, {
        method: mutation.method,
        headers,
        body: mutation.body,
      });

      if (res.ok || res.status === 409 /* conflict = already applied */) {
        await clearMutation(tenantSlug, mutation.id);
        result.processed++;
      } else {
        await incrementRetries(tenantSlug, mutation.id);
        result.failed++;
        result.errors.push({ id: mutation.id, error: `HTTP ${res.status}` });
      }
    } catch (err) {
      await incrementRetries(tenantSlug, mutation.id);
      result.failed++;
      result.errors.push({
        id: mutation.id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return result;
}

/**
 * Register an online listener that automatically syncs pending mutations
 * when the network is restored.
 * Returns a cleanup function to remove the listener.
 */
export function registerSyncOnReconnect(
  tenantSlug: string,
  getToken: () => string | null,
  onSyncComplete?: (result: SyncResult) => void,
): () => void {
  const handler = async () => {
    const result = await syncPendingMutations(tenantSlug, getToken());
    onSyncComplete?.(result);
  };
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}
