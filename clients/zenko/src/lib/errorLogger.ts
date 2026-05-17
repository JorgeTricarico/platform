/**
 * Frontend error reporter.
 *
 * Captura errores de la UI (React boundary, window.error, unhandledrejection)
 * y los postea en batches al endpoint `POST /api/errors` del backend para que
 * el dueño pueda revisar problemas sin depender de un reporte manual.
 *
 * Nunca crashea: si el backend no responde o no hay red, se pierde el log
 * silenciosamente.
 */

import { API_BASE } from '../services/config';
import { BUSINESS } from '../config/business';

interface LogPayload {
  business: string;
  source: 'frontend';
  level: 'error' | 'warning';
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  userName?: string;
  metadata?: Record<string, unknown>;
}

const MAX_QUEUE = 20;
const FLUSH_DELAY_MS = 1000;

let queue: LogPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function logError(
  err: unknown,
  level: 'error' | 'warning' = 'error',
  metadata?: Record<string, unknown>,
): void {
  if (queue.length >= MAX_QUEUE) return; // safety: drop si overflow

  let message: string;
  let stack: string | undefined;

  if (typeof err === 'string') {
    message = err;
  } else if (err instanceof Error) {
    message = err.message || 'Unknown error';
    stack = err.stack;
  } else if (err && typeof err === 'object' && 'message' in err) {
    message = String((err as { message: unknown }).message);
    if ('stack' in err) stack = String((err as { stack: unknown }).stack);
  } else {
    message = 'Unknown error';
  }

  const payload: LogPayload = {
    business: BUSINESS.slug,
    source: 'frontend',
    level,
    message,
    stack,
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    userName: getCurrentUserName(),
    metadata,
  };

  queue.push(payload);
  scheduleFlush();
}

function scheduleFlush(): void {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_DELAY_MS);
}

async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const batch = queue.splice(0);
  const endpoint = `${API_BASE}/api/errors`;

  for (const item of batch) {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
        keepalive: true, // permite enviar incluso si el user navega lejos
      });
    } catch {
      // No re-throw: el logger jamás debe crashear la app
    }
  }
}

/**
 * Lee el nombre del usuario logueado a partir del JWT en localStorage.
 * Devuelve undefined si no hay sesión o el token está corrupto.
 *
 * Coincide con la lógica de AuthContext: el payload del JWT contiene `name`.
 */
function getCurrentUserName(): string | undefined {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return undefined;
    const parts = token.split('.');
    if (parts.length < 2) return undefined;
    const payload = JSON.parse(atob(parts[1])) as { name?: string; email?: string };
    return payload.name ?? payload.email ?? undefined;
  } catch {
    return undefined;
  }
}

export function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event: ErrorEvent) => {
    logError(event.error ?? event.message ?? 'Unknown window error', 'error', {
      type: 'window.error',
      filename: event.filename,
      lineno: event.lineno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    const errOrText = reason instanceof Error ? reason : String(reason);
    logError(errOrText, 'error', { type: 'unhandledrejection' });
  });
}

// ─── Test helpers ────────────────────────────────────────────────────────────

export function __clearQueueForTests(): void {
  queue = [];
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

export function __getQueueForTests(): readonly LogPayload[] {
  return queue;
}

export async function __flushNowForTests(): Promise<void> {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flush();
}
