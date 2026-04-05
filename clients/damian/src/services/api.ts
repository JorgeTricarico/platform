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

export const fetchFinances = async (): Promise<DBFinance[]> => {
  const res = await fetch(`${API_URL}/finances`);
  if (!res.ok) throw new Error("Error al obtener finanzas");
  return res.json();
};
