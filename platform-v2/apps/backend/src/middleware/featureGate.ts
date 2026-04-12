import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError, type AppRequest } from '../types.js';

// Feature name type — mirrors FeaturesConfig keys from @platform/config schema
export type FeatureName =
  | 'garments'
  | 'appointments'
  | 'patientRecords'
  | 'finances'
  | 'whatsapp'
  | 'aiChat'
  | 'photoGallery'
  | 'publicStatus'
  | 'qrTickets';

/**
 * Middleware factory that checks whether a feature is enabled for the current tenant.
 *
 * Returns 404 (as if the route doesn't exist) when the feature is disabled.
 * This is intentional: disabled features should be invisible, not just forbidden.
 *
 * Usage:
 *   router.use('/garments', requireFeature('garments'), garmentsRouter);
 */
export function requireFeature(feature: FeatureName): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const appReq = req as AppRequest;

    if (!appReq.tenant) {
      return next(AppError.internal('requireFeature used before tenantMiddleware'));
    }

    const features = appReq.tenant.features as Record<string, boolean>;
    const enabled = features[feature];
    if (!enabled) {
      return next(AppError.featureDisabled(feature));
    }

    next();
  };
}

/**
 * Checks multiple features — all must be enabled.
 */
export function requireAllFeatures(...features: FeatureName[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const appReq = req as AppRequest;

    if (!appReq.tenant) {
      return next(AppError.internal('requireAllFeatures used before tenantMiddleware'));
    }

    const featureMap = appReq.tenant.features as Record<string, boolean>;
    for (const feature of features) {
      if (!featureMap[feature]) {
        return next(AppError.featureDisabled(feature));
      }
    }

    next();
  };
}
