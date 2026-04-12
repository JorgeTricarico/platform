/**
 * TenantContext — provides the resolved TenantConfig to all components.
 *
 * The config is loaded once in main.tsx and injected here.
 * Use useTenant() to read it from any component.
 */
import { createContext, useContext } from 'react';
import type { TenantConfig } from '@platform/config';

export const TenantContext = createContext<TenantConfig | null>(null);

export function useTenant(): TenantConfig {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error('useTenant must be used inside <TenantContext.Provider>');
  }
  return ctx;
}

/**
 * Convenience hook — returns just the feature flags.
 */
export function useFeatures() {
  return useTenant().features;
}

/**
 * Returns true if a specific feature is enabled for the current tenant.
 */
export function useFeatureFlag(feature: keyof TenantConfig['features']): boolean {
  return useTenant().features[feature] ?? false;
}
