import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { AppRequest } from './types.js';
import { requireFeature } from './middleware/featureGate.js';

// ─── Route imports ────────────────────────────────────────────────────────────

import authRouter from './routes/auth.js';
import healthRouter from './routes/health.js';
import clientsRouter from './routes/clients.js';
import garmentsRouter from './routes/garments.js';
import appointmentsRouter from './routes/appointments.js';
import patientRecordsRouter from './routes/patient-records.js';
import financesRouter from './routes/finances.js';

const api = Router();

// ─── Public routes (no feature gate) ─────────────────────────────────────────

api.use('/health', healthRouter);
api.use('/auth', authRouter);

// ─── Clients (shared, always available) ──────────────────────────────────────

api.use('/clients', clientsRouter);

// ─── Patient records nested under /patients/:patientId/records ───────────────
// Feature gated: patientRecords
// The records router uses mergeParams: true so it receives :patientId

api.use(
  '/patients/:patientId/records',
  requireFeature('patientRecords'),
  patientRecordsRouter,
);

// ─── Feature-gated routes ─────────────────────────────────────────────────────

api.use('/garments', requireFeature('garments'), garmentsRouter);
api.use('/appointments', requireFeature('appointments'), appointmentsRouter);
api.use('/finances', requireFeature('finances'), financesRouter);

// ─── Tenant info endpoint ─────────────────────────────────────────────────────

api.get('/tenant', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const appReq = req as AppRequest;
    res.json({
      ok: true,
      data: {
        slug: appReq.tenant.slug,
        name: appReq.tenant.name,
        businessName: appReq.tenant.businessName,
        currency: appReq.tenant.currency,
        timezone: appReq.tenant.timezone,
        locale: appReq.tenant.locale,
        features: appReq.tenant.features,
        theme: appReq.tenant.theme,
        services: appReq.tenant.services,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default api;
