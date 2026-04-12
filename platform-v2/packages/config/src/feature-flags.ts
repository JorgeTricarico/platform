import type { FeatureFlags } from '@platform/types';
export { DEFAULT_FEATURE_FLAGS } from '@platform/types';

/**
 * Merge partial feature flag overrides onto the defaults.
 * Any key not present in overrides keeps the default value.
 */
export function mergeFeatureFlags(
  overrides: Partial<FeatureFlags>,
): FeatureFlags {
  const { DEFAULT_FEATURE_FLAGS } = require('@platform/types');
  return { ...DEFAULT_FEATURE_FLAGS, ...overrides };
}

/**
 * Validate a feature flags object has all required keys.
 * Throws if any key is missing.
 */
export function validateFeatureFlags(flags: unknown): asserts flags is FeatureFlags {
  const required: Array<keyof FeatureFlags> = [
    'orders',
    'appointments',
    'finance',
    'patientRecords',
    'whatsappNotifications',
    'qrCodes',
    'aiChat',
    'offlineSync',
    'darkMode',
    'multiLocation',
  ];
  if (typeof flags !== 'object' || flags === null) {
    throw new Error('[config] feature flags must be an object');
  }
  for (const key of required) {
    if (typeof (flags as Record<string, unknown>)[key] !== 'boolean') {
      throw new Error(`[config] feature flag "${key}" must be a boolean`);
    }
  }
}
