/**
 * TEMPLATE: Extended feature flags for a new tenant.
 *
 * Copy this file to tenants/my_tenant/features.ts and customize.
 * All flags default to false / conservative values.
 *
 * These override the platform defaults in packages/config/src/defaults.ts.
 */

import type { FeatureDefaults } from '@platform/config'

export interface TenantFeatureOverrides extends Partial<FeatureDefaults> {
  // ── Client management ────────────────────────────────────────────────────
  canDeleteClients: boolean
  canExportCsv: boolean

  // ── Garments (if features.garments = true) ────────────────────────────────
  maxPhotosPerOrder: number
  allowCustomPriceOverride: boolean
  overdueThresholdDays: number

  // ── Appointments (if features.appointments = true) ────────────────────────
  recurringAppointments: boolean
  defaultAppointmentDuration: number
  allowDoubleBooking: boolean
  reminderHoursBefore: number
  cancellationPolicyHours: number

  // ── Finances ─────────────────────────────────────────────────────────────
  trackExpenses: boolean
  defaultPaymentMethod: 'cash' | 'transfer' | 'card'

  // ── UI preferences ────────────────────────────────────────────────────────
  defaultPageSize: number
  dateFormat: string
  timeFormat: string
  currencySymbol: string
  currencyDecimals: number
}

export const tenantFeatures: TenantFeatureOverrides = {
  // Client management
  canDeleteClients: false,
  canExportCsv: false,

  // Garments
  maxPhotosPerOrder: 5,
  allowCustomPriceOverride: true,
  overdueThresholdDays: 90,

  // Appointments
  recurringAppointments: false,
  defaultAppointmentDuration: 60,
  allowDoubleBooking: false,
  reminderHoursBefore: 24,
  cancellationPolicyHours: 24,

  // Finances
  trackExpenses: false,
  defaultPaymentMethod: 'cash',

  // UI
  defaultPageSize: 20,
  dateFormat: 'dd/MM/yyyy',
  timeFormat: 'HH:mm',
  currencySymbol: '$',
  currencyDecimals: 0,
}

export default tenantFeatures
