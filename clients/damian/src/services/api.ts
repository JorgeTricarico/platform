export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/damian';

import { getCachedData, setCachedData, queueMutation } from './db';

async function cachedFetch<T>(url: string): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setCachedData(url, data);
    return data;
  } catch (err) {
    const cached = await getCachedData<T>(url);
    if (cached) return cached;
    throw err;
  }
}

async function mutationFetch(url: string, method: string, body?: unknown): Promise<Response> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return res;
  } catch (err) {
    if (!navigator.onLine) {
      await queueMutation({ url, method, body: body ? JSON.stringify(body) : undefined });
      // Return a fake "accepted" response for offline
      return new Response(JSON.stringify({ offline: true, queued: true }), { status: 202 });
    }
    throw err;
  }
}

export interface DBAppointment {
  id: string;
  clientName: string;
  clientPhone: string;
  service: string;
  duration: number;
  date: string;
  time: string;
  status: string;
  price: number;
  notes?: string;
}

export interface DBFinance {
  id: string;
  date: string;
  type: string;
  category: string;
  amount: number;
  description: string;
}

export const fetchAppointments = async (): Promise<DBAppointment[]> => {
  return cachedFetch<DBAppointment[]>(`${API_URL}/appointments`);
};

export const createAppointment = async (data: Partial<DBAppointment>): Promise<DBAppointment> => {
  const res = await mutationFetch(`${API_URL}/appointments`, 'POST', data);
  if (res.status === 409) {
    const body = await res.json();
    throw Object.assign(new Error(body.error || 'Conflicto de horario'), { status: 409 });
  }
  if (!res.ok && res.status !== 202) throw new Error("Error al crear cita");
  return res.json();
};

export const updateAppointment = async (id: string, data: Record<string, unknown>): Promise<DBAppointment> => {
  const res = await mutationFetch(`${API_URL}/appointments/${id}`, 'PUT', data);
  if (res.status === 409) {
    const body = await res.json();
    throw Object.assign(new Error(body.error || 'Conflicto de horario'), { status: 409 });
  }
  if (!res.ok && res.status !== 202) throw new Error("Error al actualizar cita");
  return res.json();
};

export const updateAppointmentStatus = async (id: string, status: string): Promise<DBAppointment> => {
  const res = await mutationFetch(`${API_URL}/appointments/${id}/status`, 'PUT', { status });
  if (!res.ok && res.status !== 202) throw new Error("Error al actualizar cita");
  return res.json();
};

export const fetchFinances = async (month?: string): Promise<DBFinance[]> => {
  const params = month ? `?month=${month}` : '';
  return cachedFetch<DBFinance[]>(`${API_URL}/finances${params}`);
};

export const createFinance = async (data: Partial<DBFinance>): Promise<DBFinance> => {
  const res = await mutationFetch(`${API_URL}/finances`, 'POST', data);
  if (!res.ok && res.status !== 202) throw new Error("Error al guardar el registro");
  return res.json();
};

export const updateFinance = async (id: string, data: Record<string, unknown>): Promise<DBFinance> => {
  const res = await mutationFetch(`${API_URL}/finances/${id}`, 'PUT', data);
  if (!res.ok && res.status !== 202) throw new Error("Error al actualizar el registro");
  return res.json();
};

export const deleteFinance = async (id: string): Promise<void> => {
  const res = await mutationFetch(`${API_URL}/finances/${id}`, 'DELETE');
  if (!res.ok && res.status !== 202) throw new Error("Error al eliminar el registro");
};

// --- CLIENTES ---

export interface DBClient {
  id: string;
  name: string;
  phone: string;
  altPhone?: string;
  email?: string;
  business: string;
  notes?: string;
  createdAt: string;
}

export const fetchClients = async (): Promise<DBClient[]> => {
  return cachedFetch<DBClient[]>(`${API_URL}/clients`);
};

export const searchClients = async (q: string): Promise<DBClient[]> => {
  return cachedFetch<DBClient[]>(`${API_URL}/clients/search?q=${encodeURIComponent(q)}`);
};

export const createClient = async (data: Partial<DBClient>): Promise<DBClient> => {
  const res = await mutationFetch(`${API_URL}/clients`, 'POST', data);
  if (!res.ok && res.status !== 202) throw new Error("Error al registrar cliente");
  return res.json();
};

export const updateClient = async (id: string, data: Partial<DBClient>): Promise<DBClient> => {
  const res = await mutationFetch(`${API_URL}/clients/${id}`, 'PUT', data);
  if (!res.ok && res.status !== 202) throw new Error("Error al actualizar cliente");
  return res.json();
};

// --- PACIENTES (con info de fichas) ---

export interface DBPatient extends DBClient {
  totalRecords: number;
  lastVisit: string | null;
  lastReason: string | null;
}

export interface DBPatientRecord {
  id: string;
  clientId: string;
  date: string;
  reason: string;
  symptoms?: string;
  areas?: string;
  treatment?: string;
  observations?: string;
  nextSession?: string;
  createdAt: string;
}

export const fetchPatients = async (): Promise<DBPatient[]> => {
  return cachedFetch<DBPatient[]>(`${API_URL}/patients`);
};

export const fetchPatientRecords = async (clientId: string): Promise<DBPatientRecord[]> => {
  return cachedFetch<DBPatientRecord[]>(`${API_URL}/patients/${clientId}/records`);
};

export const createPatientRecord = async (clientId: string, data: Partial<DBPatientRecord>): Promise<DBPatientRecord> => {
  const res = await mutationFetch(`${API_URL}/patients/${clientId}/records`, 'POST', data);
  if (!res.ok && res.status !== 202) throw new Error("Error al crear ficha");
  return res.json();
};

// --- DASHBOARD ---

export interface DashboardStalePatient extends DBClient {
  lastVisit: string | null;
  lastReason: string | null;
}

export const fetchDashboardToday = async (): Promise<DBAppointment[]> => {
  return cachedFetch<DBAppointment[]>(`${API_URL}/dashboard/today`);
};

export const fetchDashboardAppointments = async (): Promise<DBAppointment[]> => {
  return cachedFetch<DBAppointment[]>(`${API_URL}/dashboard/appointments`);
};

export const fetchDashboardStalePatients = async (): Promise<DashboardStalePatient[]> => {
  return cachedFetch<DashboardStalePatient[]>(`${API_URL}/dashboard/stale-patients`);
};

// --- AGENTE IA ---

export interface AgentAction {
  type: string;
  action?: string;
  query?: string | null;
  [key: string]: unknown;
}

export interface AgentResponse {
  reply: string;
  actions?: AgentAction[];
}

export const sendAgentMessage = async (message: string, history: unknown[] = []): Promise<AgentResponse> => {
  const res = await mutationFetch(`${API_URL}/agent`, 'POST', { message, history });
  if (!res.ok && res.status !== 202) throw new Error("Error del agente");
  return res.json();
};
