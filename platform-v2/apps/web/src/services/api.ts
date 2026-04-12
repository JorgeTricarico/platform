/**
 * Tenant-scoped API client for the web app.
 *
 * All requests are routed through /api/<tenantSlug>/.
 * JWT is auto-attached from localStorage.
 * Offline mutations are queued to IndexedDB and replayed when online.
 */

import { getToken } from '@platform/api-client';
import type {
  Order,
  CreateOrderInput,
  UpdateOrderInput,
  Appointment,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  Finance,
  CreateFinanceInput,
  Client,
  CreateClientInput,
  PatientRecord,
  CreatePatientRecordInput,
} from '@platform/types';

// ─── Offline queue (IndexedDB) ────────────────────────────────────────────────

interface QueuedMutation {
  id: string;
  url: string;
  method: string;
  body?: string;
  timestamp: number;
}

const DB_NAME = 'platform_offline';
const DB_STORE = 'mutations';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueMutation(m: Omit<QueuedMutation, 'id' | 'timestamp'>): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(DB_STORE, 'readwrite');
  tx.objectStore(DB_STORE).put({
    ...m,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
  });
}

export async function replayOfflineQueue(): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(DB_STORE, 'readwrite');
  const store = tx.objectStore(DB_STORE);
  const mutations: QueuedMutation[] = await new Promise((res, rej) => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result as QueuedMutation[]);
    req.onerror = () => rej(req.error);
  });
  let replayed = 0;
  for (const m of mutations) {
    try {
      const r = await fetch(m.url, {
        method: m.method,
        headers: buildHeaders(m.body !== undefined),
        body: m.body,
      });
      if (r.ok) {
        store.delete(m.id);
        replayed++;
      }
    } catch {
      // Leave in queue — still offline
    }
  }
  return replayed;
}

// ─── Core helpers ─────────────────────────────────────────────────────────────

function buildHeaders(hasBody = false): Record<string, string> {
  const h: Record<string, string> = {};
  const token = getToken();
  if (token && token !== 'demo') h['Authorization'] = `Bearer ${token}`;
  if (hasBody) h['Content-Type'] = 'application/json';
  return h;
}

// ─── API Client factory ───────────────────────────────────────────────────────

export interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  delete(path: string): Promise<void>;
}

export function createApiClient(baseUrl: string, tenantSlug: string): ApiClient {
  const base = `${baseUrl}/api/${tenantSlug}`;

  async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
    const url = `${base}${path}`;
    const hasBody = body !== undefined;
    try {
      const res = await fetch(url, {
        method,
        headers: buildHeaders(hasBody),
        body: hasBody ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as Record<string, unknown>;
        const err = Object.assign(
          new Error((errBody['error'] as string | undefined) ?? `HTTP ${res.status}`),
          { status: res.status, body: errBody },
        );
        throw err;
      }
      if (res.status === 204 || res.headers.get('content-length') === '0') {
        return undefined as T;
      }
      return res.json() as Promise<T>;
    } catch (err) {
      if (!navigator.onLine && method !== 'GET') {
        await queueMutation({ url, method, body: hasBody ? JSON.stringify(body) : undefined });
        return { offline: true, queued: true } as T;
      }
      throw err;
    }
  }

  return {
    get: <T>(path: string) => request<T>(path, 'GET'),
    post: <T>(path: string, body: unknown) => request<T>(path, 'POST', body),
    put: <T>(path: string, body: unknown) => request<T>(path, 'PUT', body),
    patch: <T>(path: string, body: unknown) => request<T>(path, 'PATCH', body),
    delete: (path: string) => request<void>(path, 'DELETE'),
  };
}

// ─── Domain-specific API hooks ────────────────────────────────────────────────

export function createOrdersApi(client: ApiClient) {
  return {
    list: () => client.get<Order[]>('/orders'),
    get: (id: string) => client.get<Order>(`/orders/${id}`),
    create: (data: CreateOrderInput) => client.post<Order>('/orders', data),
    update: (id: string, data: UpdateOrderInput) => client.put<Order>(`/orders/${id}`, data),
    delete: (id: string) => client.delete(`/orders/${id}`),
    updateStatus: (id: string, status: string) =>
      client.patch<Order>(`/orders/${id}/status`, { status }),
  };
}

export function createAppointmentsApi(client: ApiClient) {
  return {
    list: () => client.get<Appointment[]>('/appointments'),
    get: (id: string) => client.get<Appointment>(`/appointments/${id}`),
    create: (data: CreateAppointmentInput) => client.post<Appointment>('/appointments', data),
    update: (id: string, data: UpdateAppointmentInput) =>
      client.put<Appointment>(`/appointments/${id}`, data),
    delete: (id: string) => client.delete(`/appointments/${id}`),
    updateStatus: (id: string, status: string) =>
      client.patch<Appointment>(`/appointments/${id}/status`, { status }),
  };
}

export function createFinancesApi(client: ApiClient) {
  return {
    list: () => client.get<Finance[]>('/finances'),
    create: (data: CreateFinanceInput) => client.post<Finance>('/finances', data),
    update: (id: string, data: Partial<Finance>) => client.put<Finance>(`/finances/${id}`, data),
    delete: (id: string) => client.delete(`/finances/${id}`),
  };
}

export function createClientsApi(client: ApiClient) {
  return {
    list: () => client.get<Client[]>('/clients'),
    get: (id: string) => client.get<Client>(`/clients/${id}`),
    create: (data: CreateClientInput) => client.post<Client>('/clients', data),
    update: (id: string, data: Partial<Client>) => client.put<Client>(`/clients/${id}`, data),
    delete: (id: string) => client.delete(`/clients/${id}`),
  };
}

export function createPatientRecordsApi(client: ApiClient) {
  return {
    list: (clientId: string) => client.get<PatientRecord[]>(`/patients/${clientId}/records`),
    create: (clientId: string, data: CreatePatientRecordInput) =>
      client.post<PatientRecord>(`/patients/${clientId}/records`, data),
    update: (clientId: string, id: string, data: Partial<PatientRecord>) =>
      client.put<PatientRecord>(`/patients/${clientId}/records/${id}`, data),
    delete: (clientId: string, id: string) =>
      client.delete(`/patients/${clientId}/records/${id}`),
  };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  todayCount: number;
  pendingCount: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  recentActivity: Array<{
    id: string;
    type: 'order' | 'appointment' | 'finance';
    label: string;
    sublabel: string;
    timestamp: string;
    status?: string;
  }>;
  byStatus: Record<string, number>;
}

export function createDashboardApi(client: ApiClient) {
  return {
    get: () => client.get<DashboardStats>('/dashboard'),
  };
}
