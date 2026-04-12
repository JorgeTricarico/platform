import type { TenantConfigInput } from './schema.js'

/**
 * Default values applied to every tenant config before validation.
 * Only optional/defaultable fields are listed here — required fields
 * (slug, name, businessName) must be provided explicitly by each tenant.
 *
 * These are the sensible platform-wide defaults for the Argentina market.
 */
export const TENANT_DEFAULTS = {
  currency: 'ARS',
  timezone: 'America/Buenos_Aires',
  locale: 'es-AR',
  owners: [],
  services: [],

  features: {
    garments: false,
    appointments: false,
    patientRecords: false,
    finances: false,
    whatsapp: false,
    aiChat: false,
    photoGallery: false,
    publicStatus: false,
    qrTickets: false,
  },

  theme: {
    primaryColor: '#6366f1',
    accentColor: '#f59e0b',
    colorScheme: 'light' as const,
  },
} satisfies Partial<TenantConfigInput>

// ---------------------------------------------------------------------------
// Feature-level defaults
// ---------------------------------------------------------------------------

export const FEATURE_DEFAULTS = {
  /** Client management */
  canDeleteClients: false,
  canExportCsv: false,

  /** Garments */
  maxPhotosPerOrder: 5,
  allowCustomPriceOverride: true,

  /** Appointments */
  recurringAppointments: false,
  defaultAppointmentDuration: 60,
  allowDoubleBooking: false,
  reminderHoursBefore: 24,

  /** Finances */
  defaultPaymentMethod: 'cash' as const,
  trackExpenses: false,

  /** AI */
  streamResponses: true,
  maxConversationHistory: 10,

  /** UI */
  defaultPageSize: 20,
  dateFormat: 'dd/MM/yyyy',
  timeFormat: 'HH:mm',
  currencySymbol: '$',
  currencyDecimals: 0,
} as const

export type FeatureDefaults = typeof FEATURE_DEFAULTS

// ---------------------------------------------------------------------------
// AI model defaults per tier
// ---------------------------------------------------------------------------

export const AI_MODEL_DEFAULTS = {
  fast: 'claude-3-5-haiku-20241022',
  standard: 'claude-3-5-sonnet-20241022',
  powerful: 'claude-opus-4-5',
} as const

// ---------------------------------------------------------------------------
// WhatsApp template name defaults
// ---------------------------------------------------------------------------

export const WHATSAPP_TEMPLATE_DEFAULTS: Record<string, string> = {
  orderReady: 'order_ready_notification',
  appointmentReminder: 'appointment_reminder',
  appointmentConfirmation: 'appointment_confirmation',
  appointmentCancellation: 'appointment_cancellation',
  paymentReceived: 'payment_received',
}
