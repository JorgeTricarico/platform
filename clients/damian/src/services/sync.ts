import { getPendingMutations, clearMutation } from './db';

let syncing = false;

export async function syncPendingMutations(): Promise<number> {
  if (syncing) return 0;
  syncing = true;
  let synced = 0;
  try {
    const mutations = await getPendingMutations();
    for (const m of mutations) {
      try {
        const res = await fetch(m.url, {
          method: m.method,
          headers: m.body ? { 'Content-Type': 'application/json' } : undefined,
          body: m.body,
        });
        if (res.ok && m.id) {
          await clearMutation(m.id);
          synced++;
        }
      } catch {
        break; // still offline, stop trying
      }
    }
  } finally {
    syncing = false;
  }
  return synced;
}

export function setupOnlineSync(onSync?: (count: number) => void): () => void {
  const handler = async () => {
    const count = await syncPendingMutations();
    if (count > 0 && onSync) onSync(count);
  };
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}
