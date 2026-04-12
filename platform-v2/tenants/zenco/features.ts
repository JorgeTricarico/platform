/**
 * Extended feature flags and capability overrides for the Zenko tenant.
 *
 * These go beyond the binary feature toggles in config.ts
 * and control fine-grained behaviors within each module.
 */

import type { FeatureDefaults } from '@platform/config'

export interface ZencoFeatureOverrides extends Partial<FeatureDefaults> {
  // ── Client management ────────────────────────────────────────────────────
  /** Allow deleting clients (with cascade to their orders). Default: true */
  canDeleteClients: boolean
  /** CSV export of orders / finances. Pending implementation. */
  canExportCsv: boolean

  // ── Garments / Orders ─────────────────────────────────────────────────────
  /** Maximum photos allowed per order */
  maxPhotosPerOrder: number
  /** Allow operator to override the default price on an order */
  allowCustomPriceOverride: boolean
  /** Show the "Estado Público" QR-scannable page to clients */
  showPublicStatusPage: boolean
  /** Auto-advance order to "en_proceso" after intake — disabled, manual flow */
  autoAdvanceStatus: boolean
  /** Days after "listo" before showing "overdue" warning */
  overdueThresholdDays: number

  // ── Finances ─────────────────────────────────────────────────────────────
  /** Track raw material / supply expenses */
  trackExpenses: boolean
  /** Show profit/margin calculations */
  showMargin: boolean

  // ── WhatsApp ─────────────────────────────────────────────────────────────
  /** Send WhatsApp automatically when order status changes to "listo" */
  autoWhatsappOnReady: boolean

  // ── UI preferences ────────────────────────────────────────────────────────
  /** Default number of rows in paginated lists */
  defaultPageSize: number
  /** Date display format */
  dateFormat: string
  /** Time display format */
  timeFormat: string
  /** Currency symbol for display */
  currencySymbol: string
  /** Decimal places for prices */
  currencyDecimals: number
}

export const zencoFeatures: ZencoFeatureOverrides = {
  // Client management
  canDeleteClients: true,
  canExportCsv: false, // pending: Z-export milestone

  // Garments
  maxPhotosPerOrder: 5,
  allowCustomPriceOverride: true,
  showPublicStatusPage: true,
  autoAdvanceStatus: false,
  overdueThresholdDays: 90, // policy: after 90 days, taller disposes of unclaimed garments

  // Finances
  trackExpenses: false, // pending: future milestone
  showMargin: false,

  // WhatsApp
  autoWhatsappOnReady: false, // manual send — Ana/Ariel decide when to notify

  // UI
  defaultPageSize: 20,
  dateFormat: 'dd/MM/yyyy',
  timeFormat: 'HH:mm',
  currencySymbol: '$',
  currencyDecimals: 0,
}

export default zencoFeatures
