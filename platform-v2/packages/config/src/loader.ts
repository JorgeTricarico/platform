import { TenantConfigSchema, type TenantConfig, type TenantConfigInput } from './schema.js'
import { TENANT_DEFAULTS } from './defaults.js'

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const cache = new Map<string, TenantConfig>()

// ---------------------------------------------------------------------------
// Merge helpers
// ---------------------------------------------------------------------------

function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target }
  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceVal = source[key]
    const targetVal = target[key]
    if (
      sourceVal !== undefined &&
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      typeof targetVal === 'object' &&
      targetVal !== null &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      ) as T[keyof T]
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal as T[keyof T]
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Validate + merge with defaults
// ---------------------------------------------------------------------------

function parseAndValidate(raw: TenantConfigInput): TenantConfig {
  const merged = deepMerge(TENANT_DEFAULTS as TenantConfigInput, raw)

  const result = TenantConfigSchema.safeParse(merged)

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(
      `[TenantConfig] Invalid configuration for tenant "${(merged as TenantConfigInput).slug ?? 'unknown'}":\n${issues}`,
    )
  }

  return result.data
}

// ---------------------------------------------------------------------------
// Static registry (build-time)
// Used in environments where dynamic imports aren't available (e.g. Vitest).
// ---------------------------------------------------------------------------

const staticRegistry = new Map<string, TenantConfigInput>()

/**
 * Register a tenant config statically (for testing or SSR pre-registration).
 */
export function registerTenantConfig(slug: string, raw: TenantConfigInput): void {
  staticRegistry.set(slug, raw)
  // Invalidate cache so next load() call re-validates
  cache.delete(slug)
}

// ---------------------------------------------------------------------------
// Main loader
// ---------------------------------------------------------------------------

/**
 * Load and validate a tenant config by slug.
 *
 * Resolution order:
 *   1. In-memory cache (subsequent calls are free)
 *   2. Static registry (manually registered configs — useful for tests)
 *   3. Dynamic import from `tenants/{slug}/config.ts` (build-time bundler resolves this)
 *
 * @throws Error with descriptive Zod validation messages on invalid config
 */
export async function loadTenantConfig(slug: string): Promise<TenantConfig> {
  if (cache.has(slug)) {
    return cache.get(slug)!
  }

  // 2. Static registry
  if (staticRegistry.has(slug)) {
    const raw = staticRegistry.get(slug)!
    const config = parseAndValidate(raw)
    cache.set(slug, config)
    return config
  }

  // 3. Dynamic import
  let raw: TenantConfigInput
  try {
    // The bundler (Vite/Turbopack) resolves this at build time.
    // At runtime in Node.js this works via ESM dynamic import.
    const mod = await import(/* @vite-ignore */ `../../../tenants/${slug}/config.js`)
    raw = (mod.default ?? mod.config) as TenantConfigInput
    if (!raw) {
      throw new Error('Module does not export a default or named "config" export')
    }
  } catch (err) {
    throw new Error(
      `[TenantConfig] Could not load config for tenant "${slug}". ` +
        `Make sure tenants/${slug}/config.ts exists and exports a default.\n` +
        String(err),
    )
  }

  const config = parseAndValidate(raw)
  cache.set(slug, config)
  return config
}

/**
 * Synchronous version — only works if the tenant was pre-registered
 * via registerTenantConfig() or already cached.
 */
export function getTenantConfig(slug: string): TenantConfig {
  if (cache.has(slug)) {
    return cache.get(slug)!
  }
  if (staticRegistry.has(slug)) {
    const raw = staticRegistry.get(slug)!
    const config = parseAndValidate(raw)
    cache.set(slug, config)
    return config
  }
  throw new Error(
    `[TenantConfig] Config for "${slug}" not in cache. ` +
      `Call loadTenantConfig("${slug}") first, or use registerTenantConfig().`,
  )
}

/**
 * Clear the cache (useful in tests or hot-reload scenarios).
 */
export function clearTenantCache(slug?: string): void {
  if (slug) {
    cache.delete(slug)
  } else {
    cache.clear()
  }
}

/**
 * Load a config from a raw object (no file I/O) — useful in tests.
 */
export function loadTenantConfigFromObject(raw: TenantConfigInput): TenantConfig {
  const config = parseAndValidate(raw)
  cache.set(config.slug, config)
  return config
}
