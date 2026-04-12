import { z } from 'zod';

// ─── Shared / Reusable ────────────────────────────────────────────────────────

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
});

export const dateRangeSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export const searchSchema = z.object({
  q: z.string().max(200).optional(),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(1, 'Password is required'),
  tenantId: z.string().min(1).optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'viewer']).default('viewer'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ─── Client ───────────────────────────────────────────────────────────────────

export const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  phone: z
    .string()
    .min(6, 'Phone must be at least 6 digits')
    .max(20)
    .regex(/^[\d\s+\-()]+$/, 'Phone contains invalid characters'),
  altPhone: z
    .string()
    .max(20)
    .regex(/^[\d\s+\-()]+$/, 'Alt phone contains invalid characters')
    .optional(),
  notes: z.string().max(1000).optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const listClientsSchema = z.object({
  ...paginationSchema.shape,
  ...searchSchema.shape,
  ...sortSchema.shape,
  includeDeleted: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

// ─── Garments / Orders ────────────────────────────────────────────────────────

export const garmentStatusSchema = z.enum([
  'recibido',
  'en_proceso',
  'listo',
  'entregado',
]);

export const createGarmentSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  garmentName: z.string().min(1, 'Garment name is required').max(200),
  repairType: z.string().min(1, 'Repair type is required').max(100),
  description: z.string().max(2000).optional().default(''),
  status: garmentStatusSchema.optional().default('recibido'),
  intakeDate: z.string().date('Invalid intake date'),
  deliveryDate: z.string().date('Invalid delivery date'),
  price: z.number().nonnegative('Price must be non-negative'),
  deposit: z.number().nonnegative('Deposit must be non-negative').default(0),
  location: z.string().max(200).optional(),
});

export const updateGarmentSchema = createGarmentSchema
  .omit({ clientId: true })
  .partial()
  .extend({
    statusChangedAt: z.string().datetime().optional(),
  });

export const patchGarmentStatusSchema = z.object({
  status: garmentStatusSchema,
  statusChangedAt: z.string().datetime().optional(),
});

export const listGarmentsSchema = z.object({
  ...paginationSchema.shape,
  ...searchSchema.shape,
  ...sortSchema.shape,
  ...dateRangeSchema.shape,
  status: garmentStatusSchema.optional(),
  repairType: z.string().optional(),
  overdue: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  clientId: z.string().uuid().optional(),
});

// ─── Appointments ─────────────────────────────────────────────────────────────

export const appointmentStatusSchema = z.enum([
  'pendiente',
  'confirmado',
  'completado',
  'cancelado',
]);

export const createAppointmentSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  service: z.string().min(1, 'Service is required').max(200),
  duration: z.number().int().positive('Duration must be positive (minutes)').default(60),
  date: z.string().date('Invalid date format (YYYY-MM-DD)'),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format'),
  status: appointmentStatusSchema.optional().default('pendiente'),
  price: z.number().nonnegative('Price must be non-negative').default(0),
  notes: z.string().max(2000).optional(),
  location: z.string().max(200).optional().default(''),
  therapistId: z.string().uuid().optional(),
});

export const updateAppointmentSchema = createAppointmentSchema.partial();

export const patchAppointmentStatusSchema = z.object({
  status: appointmentStatusSchema,
  cancellationReason: z.string().max(500).optional(),
});

export const listAppointmentsSchema = z.object({
  ...paginationSchema.shape,
  ...searchSchema.shape,
  ...sortSchema.shape,
  ...dateRangeSchema.shape,
  status: appointmentStatusSchema.optional(),
  upcoming: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  past: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  clientId: z.string().uuid().optional(),
  therapistId: z.string().uuid().optional(),
});

// ─── Patient Records ──────────────────────────────────────────────────────────

export const createPatientRecordSchema = z.object({
  date: z.string().date('Invalid date format (YYYY-MM-DD)'),
  reason: z.string().min(1, 'Reason is required').max(500),
  symptoms: z.string().max(2000).optional(),
  areas: z.string().max(1000).optional(),
  treatment: z.string().max(2000).optional(),
  observations: z.string().max(2000).optional(),
  nextSession: z.string().date().optional(),
});

export const updatePatientRecordSchema = createPatientRecordSchema.partial();

export const listPatientRecordsSchema = z.object({
  ...paginationSchema.shape,
  ...dateRangeSchema.shape,
  ...sortSchema.shape,
});

// ─── Finances ─────────────────────────────────────────────────────────────────

export const financeTypeSchema = z.enum(['ingreso', 'gasto']);

export const createFinanceSchema = z.object({
  date: z.string().date('Invalid date format (YYYY-MM-DD)'),
  type: financeTypeSchema,
  category: z.string().min(1, 'Category is required').max(100),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().max(1000).optional().default(''),
  paymentMethod: z
    .enum(['cash', 'transfer', 'card', 'other'])
    .optional()
    .default('cash'),
  referenceId: z.string().uuid().optional(),
  referenceType: z.enum(['order', 'appointment', 'manual']).optional().default('manual'),
});

export const updateFinanceSchema = createFinanceSchema.partial();

export const listFinancesSchema = z.object({
  ...paginationSchema.shape,
  ...searchSchema.shape,
  ...sortSchema.shape,
  ...dateRangeSchema.shape,
  type: financeTypeSchema.optional(),
  category: z.string().optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format')
    .optional(),
});

export const financeSummarySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format')
    .optional(),
  year: z
    .string()
    .regex(/^\d{4}$/, 'Year must be YYYY format')
    .optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreateGarmentInput = z.infer<typeof createGarmentSchema>;
export type UpdateGarmentInput = z.infer<typeof updateGarmentSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type CreatePatientRecordInput = z.infer<typeof createPatientRecordSchema>;
export type UpdatePatientRecordInput = z.infer<typeof updatePatientRecordSchema>;
export type CreateFinanceInput = z.infer<typeof createFinanceSchema>;
export type UpdateFinanceInput = z.infer<typeof updateFinanceSchema>;
