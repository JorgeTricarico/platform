import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock db module
vi.mock('./db', () => ({
  getPendingMutations: vi.fn(),
  clearMutation: vi.fn(),
}));

import { syncPendingMutations, setupOnlineSync } from './sync';
import { getPendingMutations, clearMutation } from './db';

const mockGetPending = getPendingMutations as ReturnType<typeof vi.fn>;
const mockClear = clearMutation as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
  mockClear.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('syncPendingMutations', () => {
  it('devuelve 0 cuando no hay mutaciones pendientes', async () => {
    mockGetPending.mockResolvedValue([]);
    const count = await syncPendingMutations();
    expect(count).toBe(0);
  });

  it('envía mutaciones pendientes y las limpia de la cola', async () => {
    mockGetPending.mockResolvedValue([
      { id: 1, url: '/api/garments/1', method: 'PATCH', body: '{"status":"listo"}', timestamp: Date.now() },
      { id: 2, url: '/api/garments/2', method: 'DELETE', timestamp: Date.now() },
    ]);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const count = await syncPendingMutations();

    expect(count).toBe(2);
    expect(mockClear).toHaveBeenCalledWith(1);
    expect(mockClear).toHaveBeenCalledWith(2);
  });

  it('llama a fetch con el método y body correcto de cada mutación', async () => {
    const mutation = {
      id: 1,
      url: '/api/garments/abc',
      method: 'PATCH',
      body: '{"status":"en_proceso"}',
      timestamp: Date.now(),
    };
    mockGetPending.mockResolvedValue([mutation]);

    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    await syncPendingMutations();

    expect(mockFetch).toHaveBeenCalledWith('/api/garments/abc', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{"status":"en_proceso"}',
    });
  });

  it('sin body no envía Content-Type header', async () => {
    mockGetPending.mockResolvedValue([
      { id: 3, url: '/api/garments/xyz', method: 'DELETE', timestamp: Date.now() },
    ]);

    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    await syncPendingMutations();

    expect(mockFetch).toHaveBeenCalledWith('/api/garments/xyz', {
      method: 'DELETE',
      headers: undefined,
      body: undefined,
    });
  });

  it('deja mutaciones en cola si el servidor responde con error', async () => {
    mockGetPending.mockResolvedValue([
      { id: 1, url: '/api/garments/1', method: 'PATCH', body: '{}', timestamp: Date.now() },
    ]);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const count = await syncPendingMutations();

    expect(count).toBe(0);
    expect(mockClear).not.toHaveBeenCalled();
  });

  it('detiene la sincronización al primer error de red (sigue offline)', async () => {
    mockGetPending.mockResolvedValue([
      { id: 1, url: '/api/garments/1', method: 'PATCH', body: '{}', timestamp: Date.now() },
      { id: 2, url: '/api/garments/2', method: 'PATCH', body: '{}', timestamp: Date.now() },
    ]);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const count = await syncPendingMutations();

    expect(count).toBe(0);
    expect(mockClear).not.toHaveBeenCalled();
  });

  it('sincroniza mutaciones en orden FIFO (primera en entrar, primera en salir)', async () => {
    const order: number[] = [];
    mockGetPending.mockResolvedValue([
      { id: 1, url: '/api/a', method: 'POST', timestamp: 1000 },
      { id: 2, url: '/api/b', method: 'POST', timestamp: 2000 },
      { id: 3, url: '/api/c', method: 'POST', timestamp: 3000 },
    ]);

    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      order.push(parseInt(url.replace('/api/', '')));
      return { ok: true };
    }));

    await syncPendingMutations();

    // 'a'=NaN but we just check relative order via clearMutation calls
    expect(mockClear).toHaveBeenNthCalledWith(1, 1);
    expect(mockClear).toHaveBeenNthCalledWith(2, 2);
    expect(mockClear).toHaveBeenNthCalledWith(3, 3);
  });

  it('no inicia una segunda sincronización mientras hay una en curso', async () => {
    let resolveFirst!: () => void;
    const firstDone = new Promise<void>((res) => { resolveFirst = res; });

    mockGetPending.mockImplementation(async () => {
      await firstDone;
      return [];
    });

    const p1 = syncPendingMutations();
    const p2 = syncPendingMutations(); // debe devolver 0 inmediatamente

    resolveFirst();
    const [c1, c2] = await Promise.all([p1, p2]);

    // c2 devuelve 0 sin procesar porque syncing estaba activo
    expect(c2).toBe(0);
    // getPending solo se llamó una vez (p2 salió antes de llamarla)
    expect(mockGetPending).toHaveBeenCalledTimes(1);
    void c1;
  });
});

describe('setupOnlineSync', () => {
  it('dispara sincronización cuando el browser vuelve online', async () => {
    mockGetPending.mockResolvedValue([
      { id: 1, url: '/api/garments/1', method: 'PATCH', body: '{}', timestamp: Date.now() },
    ]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const onSync = vi.fn();
    const cleanup = setupOnlineSync(onSync);

    // Simular evento online
    window.dispatchEvent(new Event('online'));

    // Esperar que el handler async termine
    await new Promise((res) => setTimeout(res, 50));

    expect(onSync).toHaveBeenCalledWith(1);
    cleanup();
  });

  it('no llama onSync si no había mutaciones pendientes', async () => {
    mockGetPending.mockResolvedValue([]);

    const onSync = vi.fn();
    const cleanup = setupOnlineSync(onSync);

    window.dispatchEvent(new Event('online'));
    await new Promise((res) => setTimeout(res, 50));

    expect(onSync).not.toHaveBeenCalled();
    cleanup();
  });

  it('cleanup elimina el listener y no dispara más sincronizaciones', async () => {
    mockGetPending.mockResolvedValue([
      { id: 1, url: '/api/garments/1', method: 'PATCH', body: '{}', timestamp: Date.now() },
    ]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const onSync = vi.fn();
    const cleanup = setupOnlineSync(onSync);
    cleanup(); // remover listener antes de disparar el evento

    window.dispatchEvent(new Event('online'));
    await new Promise((res) => setTimeout(res, 50));

    expect(onSync).not.toHaveBeenCalled();
  });

  it('onSync reporta la cantidad exacta de mutaciones sincronizadas', async () => {
    mockGetPending.mockResolvedValue([
      { id: 1, url: '/api/a', method: 'POST', timestamp: Date.now() },
      { id: 2, url: '/api/b', method: 'POST', timestamp: Date.now() },
      { id: 3, url: '/api/c', method: 'POST', timestamp: Date.now() },
    ]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const onSync = vi.fn();
    const cleanup = setupOnlineSync(onSync);

    window.dispatchEvent(new Event('online'));
    await new Promise((res) => setTimeout(res, 50));

    expect(onSync).toHaveBeenCalledWith(3);
    cleanup();
  });
});
