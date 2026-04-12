import React, {
  createContext,
  useContext,
  type ReactNode,
  type FC,
} from 'react'
import type { TenantConfig, FeaturesConfig, ThemeConfig, ServiceConfig } from './schema.js'

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface TenantContextValue {
  /** Full validated config object */
  config: TenantConfig
  /** Shortcut to config.features */
  features: FeaturesConfig
  /** Shortcut to config.theme */
  theme: ThemeConfig
  /** Shortcut to config.services */
  services: ServiceConfig[]
  /** Check whether a feature flag is enabled */
  isEnabled: (feature: keyof FeaturesConfig) => boolean
  /** Find a service by id */
  getService: (id: string) => ServiceConfig | undefined
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TenantContext = createContext<TenantContextValue | null>(null)

TenantContext.displayName = 'TenantContext'

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface TenantProviderProps {
  config: TenantConfig
  children: ReactNode
}

export const TenantProvider: FC<TenantProviderProps> = ({ config, children }) => {
  const value: TenantContextValue = {
    config,
    features: config.features,
    theme: config.theme,
    services: config.services,

    isEnabled(feature) {
      return Boolean(config.features[feature])
    },

    getService(id) {
      return config.services.find((s) => s.id === id)
    },
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the current tenant configuration.
 *
 * @throws Error if called outside a <TenantProvider>.
 *
 * @example
 * const { config, isEnabled, getService } = useTenant()
 * if (isEnabled('appointments')) { ... }
 */
export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext)
  if (ctx === null) {
    throw new Error(
      '[useTenant] Must be used inside a <TenantProvider>. ' +
        'Wrap your app root (or the relevant subtree) with <TenantProvider config={...}>.',
    )
  }
  return ctx
}

// ---------------------------------------------------------------------------
// HOC helper (optional convenience)
// ---------------------------------------------------------------------------

/**
 * Wrap a component so it receives the tenant config as a prop.
 * Useful when you can't use hooks (class components, etc.).
 */
export function withTenant<P extends { tenant: TenantContextValue }>(
  Component: React.ComponentType<P>,
): React.ComponentType<Omit<P, 'tenant'>> {
  const Wrapped = (props: Omit<P, 'tenant'>) => {
    const tenant = useTenant()
    return <Component {...(props as P)} tenant={tenant} />
  }
  Wrapped.displayName = `withTenant(${Component.displayName ?? Component.name})`
  return Wrapped
}
