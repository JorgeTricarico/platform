/**
 * Extended feature flags and capability overrides for the MG Masajes tenant.
 *
 * Fine-grained behavioral controls for the appointments and patient records modules.
 */

import type { FeatureDefaults } from '@platform/config'

export interface MgMasajesFeatureOverrides extends Partial<FeatureDefaults> {
  // ── Client management ────────────────────────────────────────────────────
  /** Allow deleting clients (with cascade to their appointments and records) */
  canDeleteClients: boolean
  /** CSV export of appointments / finances. Pending implementation. */
  canExportCsv: boolean

  // ── Appointments ─────────────────────────────────────────────────────────
  /** Allow recurring / series appointments (e.g. weekly sessions). Pending. */
  recurringAppointments: boolean
  /** Default appointment duration in minutes when service duration is unknown */
  defaultAppointmentDuration: number
  /** Allow two clients at the same timeslot (e.g. couples massage) */
  allowDoubleBooking: boolean
  /** Send WhatsApp reminder N hours before appointment */
  reminderHoursBefore: number
  /** Block bookings if there's already one less than N minutes away */
  bookingBufferMinutes: number
  /** Minimum advance notice required for cancellations (hours) */
  cancellationPolicyHours: number

  // ── Patient Records ───────────────────────────────────────────────────────
  /** Allow attaching files/images to patient records */
  recordFileAttachments: boolean
  /** Require contraindication questionnaire on first visit */
  requireContraindicationForm: boolean

  // ── Finances ─────────────────────────────────────────────────────────────
  /** Track material/supply expenses */
  trackExpenses: boolean
  /** Default payment method */
  defaultPaymentMethod: 'cash' | 'transfer' | 'card'

  // ── UI preferences ────────────────────────────────────────────────────────
  /** Default view for the appointments page */
  defaultCalendarView: 'day' | 'week' | 'month' | 'list'
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

export const mgMasajesFeatures: MgMasajesFeatureOverrides = {
  // Client management
  canDeleteClients: true,
  canExportCsv: false, // pending export milestone

  // Appointments
  recurringAppointments: false, // pending: future milestone
  defaultAppointmentDuration: 60,
  allowDoubleBooking: false,
  reminderHoursBefore: 24,
  bookingBufferMinutes: 15,
  cancellationPolicyHours: 24,

  // Patient records
  recordFileAttachments: false, // pending: file storage integration
  requireContraindicationForm: false, // optional, Damian decides per client

  // Finances
  trackExpenses: false,
  defaultPaymentMethod: 'cash',

  // UI
  defaultCalendarView: 'week',
  defaultPageSize: 20,
  dateFormat: 'dd/MM/yyyy',
  timeFormat: 'HH:mm',
  currencySymbol: '$',
  currencyDecimals: 0,
}

export default mgMasajesFeatures
