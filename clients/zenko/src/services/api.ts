import { API_URL } from './config';
export { API_URL };

import { getCachedData, setCachedData, queueMutation } from './db';

function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = localStorage.getItem('auth_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function cachedFetch<T>(url: string): Promise<T> {
  try {
    const res = await fetch(url, { headers: getAuthHeaders() });
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
      headers: getAuthHeaders(body ? { 'Content-Type': 'application/json' } : undefined),
      body: body ? JSON.stringify(body) : undefined,
    });
    return res;
  } catch (err) {
    if (!navigator.onLine) {
      await queueMutation({ url, method, body: body ? JSON.stringify(body) : undefined });
      return new Response(JSON.stringify({ offline: true, queued: true }), { status: 202 });
    }
    throw err;
  }
}

export interface DBGarment {
  id: string;
  clientName: string;
  clientPhone: string;
  garmentName: string;
  repairType: string;
  description: string;
  status: string;
  intakeDate: string;
  deliveryDate: string;
  price: number;
  deposit?: number;
  location?: string;
}

export interface DBFinance {
  id: string;
  date: string;
  type: string;
  category: string;
  amount: number;
  description: string;
}

export interface DashboardData {
  byStatus: Record<string, number>;
  todayDeliveries: DBGarment[];
  upcomingDeliveries: DBGarment[];
  monthlyIncome: number;
  monthlyExpenses: number;
}

export const fetchDashboard = async (): Promise<DashboardData> => {
  return cachedFetch<DashboardData>(`${API_URL}/dashboard`);
};

export const fetchGarments = async (): Promise<DBGarment[]> => {
  return cachedFetch<DBGarment[]>(`${API_URL}/garments`);
};

export const fetchFinances = async (month?: string): Promise<DBFinance[]> => {
  const params = month ? `?month=${month}` : '';
  return cachedFetch<DBFinance[]>(`${API_URL}/finances${params}`);
};

export interface StaleGarment extends DBGarment {}

export const fetchStaleGarments = async (): Promise<StaleGarment[]> => {
  return cachedFetch<StaleGarment[]>(`${API_URL}/dashboard/stale-garments`);
};

export const createGarment = async (data: Partial<DBGarment>): Promise<DBGarment> => {
  const res = await mutationFetch(`${API_URL}/garments`, 'POST', data);
  if (!res.ok && res.status !== 202) throw new Error("Error al guardar la orden");
  return res.json();
};

export const updateGarment = async (id: string, data: Partial<DBGarment>): Promise<DBGarment> => {
  const res = await mutationFetch(`${API_URL}/garments/${id}`, 'PUT', data);
  if (!res.ok && res.status !== 202) throw new Error("Error al actualizar la orden");
  return res.json();
};

export const deleteGarment = async (id: string): Promise<void> => {
  const res = await mutationFetch(`${API_URL}/garments/${id}`, 'DELETE');
  if (!res.ok && res.status !== 202) throw new Error("Error al eliminar la orden");
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

export const deleteClient = async (id: string): Promise<void> => {
  const res = await mutationFetch(`${API_URL}/clients/${id}`, 'DELETE');
  if (!res.ok && res.status !== 202) throw new Error("Error al eliminar cliente");
};

export interface ClientOrdersResponse {
  client: DBClient;
  orders: DBGarment[];
  summary: { totalOrders: number; totalGarments: number; garmentsByStatus: Record<string, number> };
}

export const fetchClientOrders = async (clientId: string): Promise<ClientOrdersResponse> => {
  return cachedFetch<ClientOrdersResponse>(`${API_URL}/clients/${clientId}/orders`);
};

// --- NOTIFICACIONES ---

export interface DBNotification {
  id: string;
  clientId: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export const fetchNotifications = async (clientId: string): Promise<DBNotification[]> => {
  return cachedFetch<DBNotification[]>(`${API_URL}/notifications/${encodeURIComponent(clientId)}`);
};

export const markNotificationRead = async (id: string): Promise<DBNotification> => {
  const res = await mutationFetch(`${API_URL}/notifications/${id}/read`, 'PATCH');
  if (!res.ok && res.status !== 202) throw new Error("Error al marcar notificacion como leida");
  return res.json();
};

// --- FOTOS DE PRENDAS ---

export interface DBGarmentPhoto {
  id: string;
  garmentId: string;
  filename: string;
  url: string;
  createdAt: string;
}

export const fetchGarmentPhotos = async (garmentId: string): Promise<DBGarmentPhoto[]> => {
  return cachedFetch<DBGarmentPhoto[]>(`${API_URL}/garments/${garmentId}/photos`);
};

export const uploadGarmentPhoto = async (garmentId: string, file: File): Promise<DBGarmentPhoto> => {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await fetch(`${API_URL}/garments/${garmentId}/photos`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error("Error al subir foto");
  return res.json();
};

export const deleteGarmentPhoto = async (garmentId: string, photoId: string): Promise<void> => {
  const res = await mutationFetch(`${API_URL}/garments/${garmentId}/photos/${photoId}`, 'DELETE');
  if (!res.ok && res.status !== 202) throw new Error("Error al eliminar foto");
};
// --- PUBLIC STATUS ---

export interface PublicStatusResponse {
  id: string;
  clientName: string;
  garmentName: string;
  repairType: string;
  status: string;
  deliveryDate: string;
  price: number;
  deposit: number;
}

export const fetchPublicStatus = async (id: string): Promise<PublicStatusResponse> => {
  const res = await fetch(`${API_URL}/public/zenco/order/${id}`);
  if (!res.ok) throw new Error("No pudimos encontrar el estado de tu pedido.");
  return res.json();
};
