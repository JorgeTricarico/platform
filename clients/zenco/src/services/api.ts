export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/zenco';

export interface DBGarment {
  id: string;
  clientName: string;
  clientPhone: string;
  garmentName: string;
  repairType: string;
  description: string;
  status: string;
  deliveryDate: string;
  price: number;
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

export const fetchFinances = async (): Promise<DBFinance[]> => {
  const res = await fetch(`${API_URL}/finances`);
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
