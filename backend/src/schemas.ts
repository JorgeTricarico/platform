import { z } from 'zod';
import { normalizeArgentinePhone } from './utils/phone.js';

// --- ZENCO ---

export const GARMENT_STATUSES = ['recibido', 'en_proceso', 'listo', 'entregado'] as const;
export type GarmentStatus = typeof GARMENT_STATUSES[number];

const positivePrice = z.union([
  z.number().nonnegative(),
  z.string().transform((val, ctx) => {
    const n = Number(val);
    if (isNaN(n) || n < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Precio debe ser un numero positivo' });
      return z.NEVER;
    }
    return n;
  }),
]);

const orderItemSchema = z.object({
  garmentName: z.string().min(1),
  repairType: z.string().min(1),
  description: z.string().default(''),
  price: positivePrice,
});

export const createGarmentSchema = z.object({
  clientName: z.string().min(1),
  clientPhone: z.string().min(1),
  deliveryDate: z.string().min(1),
  items: z.array(orderItemSchema).min(1, 'Se requiere al menos una prenda'),
  intakeDate: z.string().optional(),
  status: z.enum(GARMENT_STATUSES).optional(),
  deposit: positivePrice.optional(),
  location: z.string().nullish(),
}).refine(
  (data) => {
    if (!data.intakeDate) return true;
    return new Date(data.deliveryDate) >= new Date(data.intakeDate);
  },
  { message: 'La fecha de entrega no puede ser anterior al ingreso', path: ['deliveryDate'] }
);

export const updateGarmentSchema = createGarmentSchema;

export const updateStatusSchema = z.object({
  status: z.enum(GARMENT_STATUSES),
});

export const createFinanceSchema = z.object({
  date: z.string().min(1),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1),
  amount: z.number().nonnegative({ message: 'El monto no puede ser negativo' }),
  description: z.string().min(1),
});

export const updateFinanceSchema = createFinanceSchema.partial();

export const createClientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1).refine(
    (val) => normalizeArgentinePhone(val).isValid,
    { message: 'Teléfono inválido. Usá formato 11XXXXXXXX o +código país' }
  ),
  altPhone: z.string().nullish().refine(
    (val) => !val || normalizeArgentinePhone(val).isValid,
    { message: 'Teléfono alternativo inválido' }
  ),
  email: z.string().email().nullish(),
  notes: z.string().nullish(),
});

export const updateClientSchema = createClientSchema.partial();

// --- DAMIAN ---

export const APPOINTMENT_STATUSES = ['pendiente', 'confirmado', 'completado', 'cancelado'] as const;
export type AppointmentStatus = typeof APPOINTMENT_STATUSES[number];

export const createAppointmentSchema = z.object({
  clientName: z.string().min(1),
  clientPhone: z.string().min(1),
  service: z.string().min(1),
  duration: z.number().positive(),
  date: z.string().min(1),
  time: z.string().min(1),
  price: z.number().nonnegative(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  notes: z.string().nullish(),
  location: z.string().optional(),
});

export const updateAppointmentSchema = createAppointmentSchema.partial();

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES),
});

export const createPatientRecordSchema = z.object({
  date: z.string().min(1),
  reason: z.string().min(1),
  symptoms: z.string().nullish(),
  areas: z.string().nullish(),
  treatment: z.string().nullish(),
  observations: z.string().nullish(),
  nextSession: z.string().nullish(),
});

export const updatePatientRecordSchema = z.object({
  reason: z.string().min(1).optional(),
  symptoms: z.string().nullish(),
  areas: z.string().nullish(),
  treatment: z.string().nullish(),
  observations: z.string().nullish(),
  nextSession: z.string().nullish(),
});

// --- AUTH ---

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  business: z.enum(['zenco', 'mg_masajes', 'all']),
});

export const loginSchema = z.object({
  name: z.string().min(1),
  password: z.string().min(1),
});

// --- NOTIFICATIONS ---

export const createNotificationSchema = z.object({
  clientId: z.string().min(1),
  message: z.string().min(1),
  type: z.string().optional(),
});

// --- VALIDATION HELPER ---

import type { Request, Response, NextFunction } from 'express';

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Datos invalidos',
        details: result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
