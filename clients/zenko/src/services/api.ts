export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/zenco';

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

export const fetchGarments = async (): Promise<DBGarment[]> => {
  const res = await fetch(`${API_URL}/garments`);
  if (!res.ok) throw new Error("Error al obtener prendas");
  return res.json();
};

export const fetchFinances = async (month?: string): Promise<DBFinance[]> => {
  const params = month ? `?month=${month}` : '';
  const res = await fetch(`${API_URL}/finances${params}`);
  if (!res.ok) throw new Error("Error al obtener finanzas");
  return res.json();
};

export const createGarment = async (data: Partial<DBGarment>): Promise<DBGarment> => {
  const res = await fetch(`${API_URL}/garments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Error al guardar la orden");
  return res.json();
};

export const updateGarment = async (id: string, data: Partial<DBGarment>): Promise<DBGarment> => {
  const res = await fetch(`${API_URL}/garments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Error al actualizar la orden");
  return res.json();
};

export const deleteGarment = async (id: string): Promise<void> => {
  const res = await fetch(`${API_URL}/garments/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error("Error al eliminar la orden");
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

export const updateFinance = async (id: string, data: Record<string, unknown>): Promise<DBFinance> => {
  const res = await fetch(`${API_URL}/finances/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Error al actualizar el registro");
  return res.json();
};

export const deleteFinance = async (id: string): Promise<void> => {
  const res = await fetch(`${API_URL}/finances/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error("Error al eliminar el registro");
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

export const updateClient = async (id: string, data: Partial<DBClient>): Promise<DBClient> => {
  const res = await fetch(`${API_URL}/clients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Error al actualizar cliente");
  return res.json();
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
  const res = await fetch(`${API_URL}/notifications/${encodeURIComponent(clientId)}`);
  if (!res.ok) throw new Error("Error al obtener notificaciones");
  return res.json();
};

export const markNotificationRead = async (id: string): Promise<DBNotification> => {
  const res = await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' });
  if (!res.ok) throw new Error("Error al marcar notificacion como leida");
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
  const res = await fetch(`${API_URL}/garments/${garmentId}/photos`);
  if (!res.ok) throw new Error("Error al obtener fotos");
  return res.json();
};

export const uploadGarmentPhoto = async (garmentId: string, file: File): Promise<DBGarmentPhoto> => {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await fetch(`${API_URL}/garments/${garmentId}/photos`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error("Error al subir foto");
  return res.json();
};

export const deleteGarmentPhoto = async (garmentId: string, photoId: string): Promise<void> => {
  const res = await fetch(`${API_URL}/garments/${garmentId}/photos/${photoId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error("Error al eliminar foto");
};
