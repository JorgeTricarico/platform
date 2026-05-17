import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  logError,
  setupGlobalErrorHandlers,
  __clearQueueForTests,
  __getQueueForTests,
  __flushNowForTests,
} from './errorLogger';

describe('errorLogger', () => {
  let originalLocation: Location;
  let originalUA: string;

  beforeEach(() => {
    vi.useFakeTimers();
    __clearQueueForTests();
    localStorage.clear();

    originalLocation = window.location;
    originalUA = navigator.userAgent;

    Object.defineProperty(window, 'location', {
      value: { href: 'https://zenko.app/orders', reload: vi.fn() },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Test)',
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUA,
      writable: true,
      configurable: true,
    });
  });

  describe('logError', () => {
    it('agrega un payload al queue con todos los campos', () => {
      logError(new Error('Boom'));
      const queue = __getQueueForTests();
      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        business: 'zenco',
        source: 'frontend',
        level: 'error',
        message: 'Boom',
        url: 'https://zenko.app/orders',
        userAgent: 'Mozilla/5.0 (Test)',
      });
      expect(queue[0].stack).toBeDefined();
    });

    it('usa string como message cuando se pasa un string', () => {
      logError('Algo se rompió');
      const queue = __getQueueForTests();
      expect(queue[0].message).toBe('Algo se rompió');
      expect(queue[0].stack).toBeUndefined();
    });

    it('extrae message y stack cuando se pasa Error', () => {
      const err = new Error('Tipo undefined');
      logError(err);
      const queue = __getQueueForTests();
      expect(queue[0].message).toBe('Tipo undefined');
      expect(queue[0].stack).toContain('Error: Tipo undefined');
    });

    it('marca level=warning cuando se pasa "warning"', () => {
      logError('cuidado', 'warning');
      const queue = __getQueueForTests();
      expect(queue[0].level).toBe('warning');
    });

    it('incluye metadata cuando se pasa', () => {
      logError(new Error('X'), 'error', { type: 'react.boundary', componentStack: '<App>' });
      const queue = __getQueueForTests();
      expect(queue[0].metadata).toEqual({ type: 'react.boundary', componentStack: '<App>' });
    });

    it('descarta extras cuando se supera el MAX_QUEUE', () => {
      for (let i = 0; i < 25; i++) {
        logError(new Error(`Error ${i}`));
      }
      const queue = __getQueueForTests();
      expect(queue.length).toBeLessThanOrEqual(20);
    });

    it('lee userName de un JWT en localStorage (auth_token)', () => {
      // JWT con name=Ana en el payload
      const payload = btoa(JSON.stringify({ userId: 'u1', email: 'ana@ana.ar', name: 'Ana', role: 'admin', business: 'zenco' }));
      const token = `header.${payload}.signature`;
      localStorage.setItem('auth_token', token);

      logError(new Error('test'));
      const queue = __getQueueForTests();
      expect(queue[0].userName).toBe('Ana');
    });

    it('userName es undefined cuando no hay token', () => {
      logError(new Error('test'));
      const queue = __getQueueForTests();
      expect(queue[0].userName).toBeUndefined();
    });

    it('userName es undefined si el token está corrupto', () => {
      localStorage.setItem('auth_token', 'not-a-jwt');
      logError(new Error('test'));
      const queue = __getQueueForTests();
      expect(queue[0].userName).toBeUndefined();
    });

    it('Error nulo no rompe (usa "Unknown error")', () => {
      logError(null);
      const queue = __getQueueForTests();
      expect(queue[0].message).toBe('Unknown error');
    });
  });

  describe('flush (POST al backend)', () => {
    it('postea cada item con POST /api/errors y keepalive: true', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'abc' }) });
      vi.stubGlobal('fetch', mockFetch);

      logError(new Error('Boom'));
      logError('warn', 'warning');

      await __flushNowForTests();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toMatch(/\/api\/errors$/);
      expect(opts.method).toBe('POST');
      expect(opts.headers['Content-Type']).toBe('application/json');
      expect(opts.keepalive).toBe(true);
      const body = JSON.parse(opts.body);
      expect(body.business).toBe('zenco');
      expect(body.source).toBe('frontend');
    });

    it('no crashea si el backend devuelve error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      vi.stubGlobal('fetch', mockFetch);

      logError(new Error('Boom'));
      // no debe lanzar
      await expect(__flushNowForTests()).resolves.toBeUndefined();
    });

    it('no crashea si fetch tira excepción (red caída)', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
      vi.stubGlobal('fetch', mockFetch);

      logError(new Error('Boom'));
      await expect(__flushNowForTests()).resolves.toBeUndefined();
    });

    it('vacía el queue después del flush', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      vi.stubGlobal('fetch', mockFetch);

      logError(new Error('A'));
      logError(new Error('B'));
      expect(__getQueueForTests()).toHaveLength(2);

      await __flushNowForTests();
      expect(__getQueueForTests()).toHaveLength(0);
    });

    it('el setTimeout dispara el flush automáticamente', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      vi.stubGlobal('fetch', mockFetch);

      logError(new Error('Boom'));
      expect(mockFetch).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1100);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('setupGlobalErrorHandlers', () => {
    it('registra listeners en window para "error" y "unhandledrejection"', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      setupGlobalErrorHandlers();
      const eventNames = addSpy.mock.calls.map((c) => c[0]);
      expect(eventNames).toContain('error');
      expect(eventNames).toContain('unhandledrejection');
      addSpy.mockRestore();
    });

    it('captura window.error event y lo loguea', () => {
      setupGlobalErrorHandlers();
      const err = new Error('Global oops');
      const evt = new ErrorEvent('error', {
        error: err,
        message: 'Global oops',
        filename: 'app.js',
        lineno: 42,
      });
      window.dispatchEvent(evt);

      const queue = __getQueueForTests();
      const found = queue.find((p) => p.message === 'Global oops');
      expect(found).toBeDefined();
      expect(found?.metadata).toMatchObject({ type: 'window.error', filename: 'app.js', lineno: 42 });
    });

    it('captura unhandledrejection con Error', () => {
      setupGlobalErrorHandlers();
      const err = new Error('Promise rechazada');
      // jsdom PromiseRejectionEvent: construir un evento custom
      const evt = new Event('unhandledrejection') as Event & { reason: unknown };
      (evt as { reason: unknown }).reason = err;
      window.dispatchEvent(evt);

      const queue = __getQueueForTests();
      const found = queue.find((p) => p.message === 'Promise rechazada');
      expect(found).toBeDefined();
      expect(found?.metadata).toMatchObject({ type: 'unhandledrejection' });
    });

    it('captura unhandledrejection con string', () => {
      setupGlobalErrorHandlers();
      const evt = new Event('unhandledrejection') as Event & { reason: unknown };
      (evt as { reason: unknown }).reason = 'Texto plano';
      window.dispatchEvent(evt);

      const queue = __getQueueForTests();
      const found = queue.find((p) => p.message === 'Texto plano');
      expect(found).toBeDefined();
    });
  });
});
