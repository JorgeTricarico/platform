export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/damian';

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
  const res = await fetch(`${API_URL}/appointments`);
  if (!res.ok) throw new Error("Error al obtener citas");
  return res.json();
};

export const createAppointment = async (data: Partial<DBAppointment>): Promise<DBAppointment> => {
  const res = await fetch(`${API_URL}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Error al crear cita");
  return res.json();
};

export const updateAppointmentStatus = async (id: string, status: string): Promise<DBAppointment> => {
  const res = await fetch(`${API_URL}/appointments/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error("Error al actualizar cita");
  return res.json();
};

export const fetchFinances = async (month?: string): Promise<DBFinance[]> => {
  const params = month ? `?month=${month}` : '';
  const res = await fetch(`${API_URL}/finances${params}`);
  if (!res.ok) throw new Error("Error al obtener finanzas");
  return res.json();
};

export const createFinance = async (data: Partial<DBFinance>): Promise<DBFinance> => {
  const res = await fetch(`${API_URL}/finances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Error al guardar el registro");
  return res.json();
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
  const res = await fetch(`${API_URL}/clients`);
  if (!res.ok) throw new Error("Error al obtener clientes");
  return res.json();
};

export const searchClients = async (q: string): Promise<DBClient[]> => {
  const res = await fetch(`${API_URL}/clients/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("Error buscando clientes");
  return res.json();
};

export const createClient = async (data: Partial<DBClient>): Promise<DBClient> => {
  const res = await fetch(`${API_URL}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Error al registrar cliente");
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
  const res = await fetch(`${API_URL}/patients`);
  if (!res.ok) throw new Error("Error al obtener pacientes");
  return res.json();
};

export const fetchPatientRecords = async (clientId: string): Promise<DBPatientRecord[]> => {
  const res = await fetch(`${API_URL}/patients/${clientId}/records`);
  if (!res.ok) throw new Error("Error al obtener fichas");
  return res.json();
};

export const createPatientRecord = async (clientId: string, data: Partial<DBPatientRecord>): Promise<DBPatientRecord> => {
  const res = await fetch(`${API_URL}/patients/${clientId}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Error al crear ficha");
  return res.json();
};

// --- DASHBOARD ---

export interface DashboardStalePatient extends DBClient {
  lastVisit: string | null;
  lastReason: string | null;
}

export const fetchDashboardToday = async (): Promise<DBAppointment[]> => {
  const res = await fetch(`${API_URL}/dashboard/today`);
  if (!res.ok) throw new Error("Error al obtener turnos de hoy");
  return res.json();
};

export const fetchDashboardAppointments = async (): Promise<DBAppointment[]> => {
  const res = await fetch(`${API_URL}/dashboard/appointments`);
  if (!res.ok) throw new Error("Error al obtener citas agendadas");
  return res.json();
};

export const fetchDashboardStalePatients = async (): Promise<DashboardStalePatient[]> => {
  const res = await fetch(`${API_URL}/dashboard/stale-patients`);
  if (!res.ok) throw new Error("Error al obtener pacientes sin ficha reciente");
  return res.json();
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
  const res = await fetch(`${API_URL}/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history })
  });
  if (!res.ok) throw new Error("Error del agente");
  return res.json();
};
