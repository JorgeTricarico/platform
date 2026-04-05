import { z } from 'zod';

// --- ZENCO ---

export const createGarmentSchema = z.object({
  clientName: z.string().min(1),
  clientPhone: z.string().min(1),
  garmentName: z.string().min(1),
  repairType: z.string().min(1),
  description: z.string().min(1),
  deliveryDate: z.string().min(1),
  price: z.union([z.number(), z.string().transform(Number)]),
  intakeDate: z.string().optional(),
  status: z.string().optional(),
});

export const updateGarmentSchema = createGarmentSchema;

export const updateStatusSchema = z.object({
  status: z.string().min(1),
});

export const createFinanceSchema = z.object({
  date: z.string().min(1),
  type: z.string().min(1),
  category: z.string().min(1),
  amount: z.number(),
  description: z.string().min(1),
});

export const createClientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  altPhone: z.string().nullish(),
  email: z.string().nullish(),
  notes: z.string().nullish(),
});

// --- DAMIAN ---

export const createAppointmentSchema = z.object({
  clientName: z.string().min(1),
  clientPhone: z.string().min(1),
  service: z.string().min(1),
  duration: z.number().positive(),
  date: z.string().min(1),
  time: z.string().min(1),
  price: z.number(),
  status: z.string().optional(),
  notes: z.string().nullish(),
  location: z.string().optional(),
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
