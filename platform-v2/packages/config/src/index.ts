// ── Existing registry & feature-flag utilities ────────────────────────────
export * from './tenant-registry.js'
export * from './feature-flags.js'
export type { TenantConfig, FeatureFlags, TenantTheme, BusinessSchedule } from '@platform/types'

// ── Zod schema & inferred types (new v2 system) ───────────────────────────
export {
  TenantConfigSchema,
  ServiceSchema,
  FeaturesSchema,
  ThemeSchema,
  AIConfigSchema,
  AIToolSchema,
  WhatsAppConfigSchema,
  type TenantConfigInput,
  type ServiceConfig,
  type FeaturesConfig,
  type ThemeConfig,
  type AIConfig,
  type AITool,
  type WhatsAppConfig,
} from './schema.js'

// ── Defaults ──────────────────────────────────────────────────────────────
export {
  TENANT_DEFAULTS,
  FEATURE_DEFAULTS,
  AI_MODEL_DEFAULTS,
  WHATSAPP_TEMPLATE_DEFAULTS,
  type FeatureDefaults,
} from './defaults.js'

// ── Loader (async + sync) ─────────────────────────────────────────────────
export {
  loadTenantConfig,
  loadTenantConfigFromObject,
  registerTenantConfig,
  clearTenantCache,
} from './loader.js'

// ── React context (TenantProvider / useTenant) ────────────────────────────
export { TenantProvider, useTenant, withTenant } from './context.js'
