export type GarmentStatus = 'recibido' | 'en_proceso' | 'listo' | 'entregado';
export type RepairType = 'cierre' | 'tela' | 'diseño' | 'dobladillo' | 'otro';

export interface Garment {
  id: string;
  clientName: string;
  clientPhone: string;
  garmentName: string;
  repairType: RepairType;
  description: string;
  status: GarmentStatus;
  deliveryDate: string;
  price: number;
}

export interface FinancialEntry {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
}

export const mockGarments: Garment[] = [
  {
    id: 'ORD-001',
    clientName: 'María G.',
    clientPhone: '11-4567-8901',
    garmentName: 'Campera de Cuero',
    repairType: 'cierre',
    description: 'Cambiar cierre frontal completo, metálico YKK.',
    status: 'en_proceso',
    deliveryDate: '2026-04-05', // Urgent
    price: 15000,
  },
  {
    id: 'ORD-002',
    clientName: 'Juan P.',
    clientPhone: '11-1234-5678',
    garmentName: 'Pantalón de Vestir',
    repairType: 'dobladillo',
    description: 'Hacer dobladillo, achicar 2cm de largo.',
    status: 'recibido',
    deliveryDate: '2026-04-06', // Upcoming
    price: 5000,
  },
  {
    id: 'ORD-003',
    clientName: 'Sofía L.',
    clientPhone: '11-9876-5432',
    garmentName: 'Vestido de Fiesta',
    repairType: 'diseño',
    description: 'Ajustar la cintura y modificar el escote.',
    status: 'listo',
    deliveryDate: '2026-04-04', // Due today
    price: 35000,
  },
  {
    id: 'ORD-004',
    clientName: 'Carlos M.',
    clientPhone: '11-5555-5555',
    garmentName: 'Camisa Blanca',
    repairType: 'tela',
    description: 'Zurcir desgarro en la manga derecha.',
    status: 'entregado',
    deliveryDate: '2026-04-01',
    price: 4500,
  }
];

export const mockFinances: FinancialEntry[] = [
  { id: 'FIN-1', date: '2026-04-01', type: 'income', category: 'Arreglos', amount: 4500, description: 'Camisa Carlos M.' },
  { id: 'FIN-2', date: '2026-04-02', type: 'expense', category: 'Insumos', amount: 15000, description: 'Compra de Hilos y Cierres YKK' },
  { id: 'FIN-3', date: '2026-04-03', type: 'income', category: 'Seña', amount: 35000, description: 'Seña 100% Vestido' },
  { id: 'FIN-4', date: '2026-04-04', type: 'expense', category: 'Servicios', amount: 12000, description: 'Pago de Luz' }
];
