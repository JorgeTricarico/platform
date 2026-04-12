# Routes

Routes are organized **by feature domain**, not by tenant.

Tenant-specific behavior is handled via:
1. **Feature gates** — `requireFeature('garments')` blocks the route if disabled
2. **Tenant config** — `req.tenant` carries the full TenantConfig (labels, WhatsApp templates, etc.)
3. **DB scoping** — Prisma middleware auto-adds `WHERE business = tenantSlug`

## File map

| File | Feature flag | Description |
|------|-------------|-------------|
| `auth.ts` | — | Login, refresh token, logout |
| `health.ts` | — | Health check endpoint |
| `clients.ts` | — | Client CRUD (shared across tenants) |
| `garments.ts` | `garments` | Order / garment repair workflow (Zenco) |
| `appointments.ts` | `appointments` | Booking calendar (MG Masajes) |
| `patient-records.ts` | `patientRecords` | Clinical history (MG Masajes) |
| `finances.ts` | `finances` | Income/expense tracking (both tenants) |

## Adding a new feature

1. Create `src/routes/my-feature.ts`
2. Add the feature flag to `@platform/config`'s `FeaturesSchema`
3. Enable/disable per-tenant in `tenants/{slug}/config.ts`
4. Mount in `src/router.ts` with `requireFeature('myFeature')`

## Request lifecycle

```
POST /api/zenco/garments
  │
  ├─ tenantMiddleware     → resolves req.tenant (from X-Tenant-ID / subdomain / env)
  ├─ requireAuth()        → validates JWT, sets req.user
  ├─ requireFeature()     → checks req.tenant.features.garments
  ├─ validate(schema)     → Zod request body validation
  └─ route handler        → business logic
```
