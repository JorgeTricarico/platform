// ─── Shared / Auth ───────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'viewer';
  /** Tenant slug(s) this user has access to, or "all" for super-admin */
  business: string;
  createdAt: string;
}

// ─── Client (shared across tenants) ─────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  phone: string;
  altPhone?: string;
  /** Tenant slug this client belongs to */
  business: string;
  createdAt: string;
}

export type CreateClientInput = Omit<Client, 'id' | 'createdAt'>;
export type UpdateClientInput = Partial<Omit<Client, 'id' | 'createdAt' | 'business'>>;

// ─── Orders (Zenco — garment repairs) ───────────────────────────────────────

export type OrderStatus = 'recibido' | 'en_proceso' | 'listo' | 'entregado';

export interface Order {
  id: string;
  orderNumber: number;
  clientName: string;
  clientPhone: string;
  garmentName: string;
  repairType: string;
  description: string;
  status: OrderStatus;
  statusChangedAt?: string;
  intakeDate: string;
  deliveryDate: string;
  price: number;
  deposit: number;
  location?: string;
  createdAt: string;
}

export type CreateOrderInput = Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'statusChangedAt'>;
export type UpdateOrderInput = Partial<Omit<Order, 'id' | 'orderNumber' | 'createdAt'>>;

// ─── GarmentPhoto ────────────────────────────────────────────────────────────

export interface GarmentPhoto {
  id: string;
  garmentId: string;
  filename: string;
  url: string;
  createdAt: string;
}

// ─── Appointments (MG Masajes) ───────────────────────────────────────────────

export type AppointmentStatus = 'pendiente' | 'confirmado' | 'completado' | 'cancelado';

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  service: string;
  /** Duration in minutes */
  duration: number;
  date: string;
  time: string;
  status: AppointmentStatus;
  price: number;
  notes?: string;
  location: string;
  createdAt: string;
}

export type CreateAppointmentInput = Omit<Appointment, 'id' | 'createdAt'>;
export type UpdateAppointmentInput = Partial<Omit<Appointment, 'id' | 'createdAt'>>;

// ─── Finance ─────────────────────────────────────────────────────────────────

export type FinanceType = 'ingreso' | 'gasto';

export interface Finance {
  id: string;
  date: string;
  type: FinanceType;
  category: string;
  amount: number;
  description: string;
  /** Tenant slug, used for routing to the correct table */
  business: string;
}

export type CreateFinanceInput = Omit<Finance, 'id'>;
export type UpdateFinanceInput = Partial<Omit<Finance, 'id' | 'business'>>;

// ─── Patient Records (MG Masajes clinical history) ──────────────────────────

export interface PatientRecord {
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

export type CreatePatientRecordInput = Omit<PatientRecord, 'id' | 'createdAt'>;
export type UpdatePatientRecordInput = Partial<Omit<PatientRecord, 'id' | 'clientId' | 'createdAt'>>;

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType = 'prenda_lista' | 'turno_confirmado' | 'turno_recordatorio' | 'custom';

export interface Notification {
  id: string;
  clientId: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  business: string;
  role: ChatRole;
  content: string;
  sessionId: string;
  createdAt: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface ZenkoDashboard {
  byStatus: Record<string, number>;
  todayDeliveries: Order[];
  upcomingDeliveries: Order[];
  overdueOrders: Order[];
  monthlyIncome: number;
  monthlyExpenses: number;
}

export interface MgMasajesDashboard {
  todayAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  overdueAppointments: Appointment[];
  monthlyIncome: number;
  monthlyExpenses: number;
  byStatus: Record<string, number>;
}

export type Dashboard = ZenkoDashboard | MgMasajesDashboard;
