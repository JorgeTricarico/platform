/**
 * TEMPLATE: Tenant configuration
 *
 * To create a new tenant:
 *   1. Copy this folder: cp -r tenants/_template tenants/my_tenant
 *   2. Replace all PLACEHOLDER values below
 *   3. Enable the features your business uses (set to true)
 *   4. Run: npx tsx scripts/validate-tenant.ts my_tenant
 *
 * Required fields: slug, name, businessName
 * Everything else has sensible defaults (see packages/config/src/defaults.ts)
 */

import type { TenantConfigInput } from '@platform/config'

const config: TenantConfigInput = {
  // ── Identity ─────────────────────────────────────────────────────────────
  // slug: URL-safe lowercase identifier. Used in API paths (/api/<slug>/*),
  //       IndexedDB namespacing, and config file location.
  //       Example: "my_salon", "peluqueria-lopez", "veterinaria123"
  slug: 'PLACEHOLDER_SLUG',

  // Short display name shown in the app header / sidebar
  name: 'PLACEHOLDER_NAME',

  // Full business name for receipts / tickets
  businessName: 'PLACEHOLDER_BUSINESS_NAME',

  // ISO 4217 currency code. Default: 'ARS'
  currency: 'ARS',

  // IANA timezone. Default: 'America/Buenos_Aires'
  timezone: 'America/Buenos_Aires',

  // BCP 47 locale tag. Default: 'es-AR'
  locale: 'es-AR',

  // Owner / operator names (display only, used in greeting messages)
  owners: ['PLACEHOLDER_OWNER'],

  // Contact details (optional)
  contactPhone: undefined, // e.g. '1165749397' (no +, no spaces)
  contactEmail: undefined, // e.g. 'hola@mibusiness.com'

  // ── Services ──────────────────────────────────────────────────────────────
  // List every service/product/treatment you offer.
  // - id: unique snake_case string (used internally)
  // - defaultPrice: base price in your currency (0 for "price on request")
  // - duration: in minutes (optional, for appointment-based services)
  services: [
    {
      id: 'service_1',
      name: 'PLACEHOLDER SERVICE 1',
      defaultPrice: 0,
      duration: 60,
      category: 'general',
      description: 'Describe this service',
    },
    // Add more services...
  ],

  // ── Features ──────────────────────────────────────────────────────────────
  // Enable only the modules your business actually uses.
  // All features default to false — only activate what you need.
  features: {
    // Garment/order tracking with QR tickets (clothing repair shops, laundries, etc.)
    garments: false,

    // Appointment/booking calendar (clinics, salons, tutors, etc.)
    appointments: false,

    // Per-client clinical or patient records (medical/wellness businesses)
    patientRecords: false,

    // Income & expense tracking
    finances: false,

    // WhatsApp Business API integration (requires whatsapp config below)
    whatsapp: false,

    // AI chat assistant (requires ai config below)
    aiChat: false,

    // Photo gallery per order / patient
    photoGallery: false,

    // Public status page (customers scan QR to see their order status)
    publicStatus: false,

    // QR ticket generation per order
    qrTickets: false,
  },

  // ── Theme ─────────────────────────────────────────────────────────────────
  theme: {
    // Hex color for primary UI elements (buttons, links, active states)
    primaryColor: '#6366f1', // indigo-500

    // Hex color for accents (badges, highlights)
    accentColor: '#f59e0b', // amber-500

    // 'light' | 'dark' | 'system'
    colorScheme: 'light',

    // Optional: absolute URL to your logo image
    // logoUrl: 'https://cdn.mybusiness.com/logo.png',

    // Optional: absolute URL to your favicon
    // faviconUrl: 'https://cdn.mybusiness.com/favicon.ico',
  },

  // ── AI Assistant ──────────────────────────────────────────────────────────
  // Required only when features.aiChat = true.
  // See tenants/zenco/prompts.ts or tenants/mg_masajes/prompts.ts for examples.
  //
  // ai: {
  //   model: 'claude-3-5-haiku-20241022',
  //   maxTokens: 1024,
  //   temperature: 0.7,
  //   systemPrompt: `Your detailed system prompt here...`,
  //   tools: [], // See AITool type in packages/config/src/schema.ts
  // },

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  // Required only when features.whatsapp = true.
  // Credentials come from environment variables — never hardcode them here.
  //
  // whatsapp: {
  //   phoneNumberId: process.env['MY_TENANT_WA_PHONE_NUMBER_ID'] ?? '',
  //   businessAccountId: process.env['MY_TENANT_WA_BUSINESS_ACCOUNT_ID'] ?? '',
  //   defaultLanguage: 'es_AR',
  //   templateNames: {
  //     // Map logical names → actual Meta template names
  //     appointmentReminder: 'my_template_name',
  //   },
  // },
}

export default config
