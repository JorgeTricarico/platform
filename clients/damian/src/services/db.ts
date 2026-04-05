const DB_NAME = 'damian_cache';
const DB_VERSION = 1;
const CACHE_STORE = 'api_cache';
const MUTATION_STORE = 'pending_mutations';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'url' });
      }
      if (!db.objectStoreNames.contains(MUTATION_STORE)) {
        db.createObjectStore(MUTATION_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedData<T>(url: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE, 'readonly');
      const store = tx.objectStore(CACHE_STORE);
      const req = store.get(url);
      req.onsuccess = () => {
        const result = req.result;
        resolve(result ? result.data as T : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

export async function setCachedData(url: string, data: unknown): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(CACHE_STORE, 'readwrite');
    const store = tx.objectStore(CACHE_STORE);
    store.put({ url, data, timestamp: Date.now() });
  } catch { /* silently fail */ }
}

export interface PendingMutation {
  id?: number;
  url: string;
  method: string;
  body?: string;
  timestamp: number;
}

export async function queueMutation(mutation: Omit<PendingMutation, 'id' | 'timestamp'>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(MUTATION_STORE, 'readwrite');
    const store = tx.objectStore(MUTATION_STORE);
    store.add({ ...mutation, timestamp: Date.now() });
  } catch { /* silently fail */ }
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(MUTATION_STORE, 'readonly');
      const store = tx.objectStore(MUTATION_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch { return []; }
}

export async function clearMutation(id: number): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(MUTATION_STORE, 'readwrite');
    const store = tx.objectStore(MUTATION_STORE);
    store.delete(id);
  } catch { /* silently fail */ }
}
