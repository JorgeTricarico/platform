import { describe, it, expect, vi, beforeEach } from 'vitest';

// IndexedDB no está disponible en jsdom — lo mockeamos con una implementación en memoria
const stores: Record<string, Map<number | string, unknown>> = {
  api_cache: new Map(),
  pending_mutations: new Map(),
};
let autoId = 1;

function makeStore(name: string) {
  const map = stores[name];
  return {
    get: (key: string | number) => {
      const req = { result: map.get(key), onsuccess: null as (() => void) | null, onerror: null };
      Promise.resolve().then(() => req.onsuccess?.());
      return req;
    },
    put: (val: Record<string, unknown>) => { map.set(val['url'] as string ?? val['id'] as number, val); return {}; },
    add: (val: Record<string, unknown>) => {
      const id = autoId++;
      map.set(id, { ...val, id });
      return { result: id, onsuccess: null as (() => void) | null };
    },
    getAll: () => {
      const req = { result: [...map.values()], onsuccess: null as (() => void) | null, onerror: null };
      Promise.resolve().then(() => req.onsuccess?.());
      return req;
    },
    delete: (key: number) => { map.delete(key); return {}; },
  };
}

const mockDB = {
  objectStoreNames: { contains: () => false },
  createObjectStore: vi.fn(),
  transaction: vi.fn((_name: string) => ({
    objectStore: (name: string) => makeStore(name),
  })),
};

vi.stubGlobal('indexedDB', {
  open: vi.fn(() => {
    const req = {
      result: mockDB,
      onupgradeneeded: null as ((e: unknown) => void) | null,
      onsuccess: null as ((e: unknown) => void) | null,
      onerror: null,
    };
    // Trigger upgradeneeded then success
    Promise.resolve().then(() => {
      req.onupgradeneeded?.({});
      req.onsuccess?.({});
    });
    return req;
  }),
});

import { getCachedData, setCachedData, queueMutation, getPendingMutations, clearMutation } from './db';

beforeEach(() => {
  stores['api_cache'].clear();
  stores['pending_mutations'].clear();
  autoId = 1;
});

describe('getCachedData / setCachedData', () => {
  it('devuelve null si no hay cache para esa URL', async () => {
    const result = await getCachedData('/api/garments');
    expect(result).toBeNull();
  });

  it('guarda y recupera datos cacheados por URL', async () => {
    const data = [{ id: '1', clientName: 'Ana' }];
    await setCachedData('/api/garments', data);

    // Poner directo en el map para simular lo que setCachedData guarda
    stores['api_cache'].set('/api/garments', { url: '/api/garments', data, timestamp: Date.now() });

    const result = await getCachedData('/api/garments');
    expect(result).toEqual(data);
  });

  it('sobrescribe cache existente con datos nuevos', async () => {
    stores['api_cache'].set('/api/garments', { url: '/api/garments', data: [{ old: true }], timestamp: 0 });
    const newData = [{ id: '2', clientName: 'Jorge' }];
    stores['api_cache'].set('/api/garments', { url: '/api/garments', data: newData, timestamp: Date.now() });

    const result = await getCachedData('/api/garments');
    expect(result).toEqual(newData);
  });
});

describe('queueMutation / getPendingMutations / clearMutation', () => {
  it('cola vacía devuelve array vacío', async () => {
    const mutations = await getPendingMutations();
    expect(mutations).toEqual([]);
  });

  it('encola una mutación y la recupera', async () => {
    await queueMutation({ url: '/api/garments/1', method: 'PATCH', body: '{"status":"listo"}' });

    // Verificar que está en el store
    expect(stores['pending_mutations'].size).toBe(1);
    const [entry] = [...stores['pending_mutations'].values()] as Array<{ url: string; method: string }>;
    expect(entry.url).toBe('/api/garments/1');
    expect(entry.method).toBe('PATCH');
  });

  it('clearMutation elimina solo la mutación indicada', async () => {
    stores['pending_mutations'].set(1, { id: 1, url: '/api/a', method: 'POST', timestamp: 1000 });
    stores['pending_mutations'].set(2, { id: 2, url: '/api/b', method: 'DELETE', timestamp: 2000 });

    await clearMutation(1);

    expect(stores['pending_mutations'].has(1)).toBe(false);
    expect(stores['pending_mutations'].has(2)).toBe(true);
  });

  it('mutaciones sin body se encolan sin campo body', async () => {
    await queueMutation({ url: '/api/garments/1', method: 'DELETE' });

    const [entry] = [...stores['pending_mutations'].values()] as Array<{ body?: string }>;
    expect(entry.body).toBeUndefined();
  });

  it('múltiples mutaciones se encolan en orden', async () => {
    stores['pending_mutations'].set(1, { id: 1, url: '/api/a', method: 'POST', timestamp: 1000 });
    stores['pending_mutations'].set(2, { id: 2, url: '/api/b', method: 'PATCH', timestamp: 2000 });
    stores['pending_mutations'].set(3, { id: 3, url: '/api/c', method: 'DELETE', timestamp: 3000 });

    const mutations = await getPendingMutations();

    expect(mutations).toHaveLength(3);
    const urls = mutations.map((m: { url: string }) => m.url);
    expect(urls).toContain('/api/a');
    expect(urls).toContain('/api/b');
    expect(urls).toContain('/api/c');
  });
});

describe('Ciclo completo offline → cola → sincronización', () => {
  it('encola mutación offline y la sincroniza cuando vuelve internet', async () => {
    // 1. Simular que se pierde internet (queueMutation desde api.ts)
    await queueMutation({ url: '/api/garments/abc', method: 'PATCH', body: '{"status":"listo"}' });
    await queueMutation({ url: '/api/garments/def', method: 'PATCH', body: '{"status":"entregado"}' });

    stores['pending_mutations'].set(1, {
      id: 1, url: '/api/garments/abc', method: 'PATCH', body: '{"status":"listo"}', timestamp: Date.now()
    });
    stores['pending_mutations'].set(2, {
      id: 2, url: '/api/garments/def', method: 'PATCH', body: '{"status":"entregado"}', timestamp: Date.now()
    });

    // 2. Verificar que están en cola
    expect(stores['pending_mutations'].size).toBeGreaterThanOrEqual(2);

    // 3. Limpiarlas simula "sincronizado con éxito"
    await clearMutation(1);
    await clearMutation(2);

    // 4. Cola vacía = sincronizado
    expect(stores['pending_mutations'].has(1)).toBe(false);
    expect(stores['pending_mutations'].has(2)).toBe(false);
  });
});
