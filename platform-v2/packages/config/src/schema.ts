import { z } from 'zod'

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

export const ServiceSchema = z.object({
  id: z.string().min(1, 'Service id is required'),
  name: z.string().min(1, 'Service name is required'),
  defaultPrice: z.number().nonnegative('Price must be >= 0'),
  duration: z.number().positive('Duration must be positive (minutes)').optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().default(true),
})

export const FeaturesSchema = z.object({
  /** Garment / clothing repair workflow (orders, QR tickets, photos) */
  garments: z.boolean().default(false),
  /** Appointment scheduling */
  appointments: z.boolean().default(false),
  /** Patient / client clinical records */
  patientRecords: z.boolean().default(false),
  /** Income / expense tracking */
  finances: z.boolean().default(false),
  /** WhatsApp Business API integration */
  whatsapp: z.boolean().default(false),
  /** AI chat assistant */
  aiChat: z.boolean().default(false),
  /** Photo gallery per order / patient */
  photoGallery: z.boolean().default(false),
  /** Public status page (QR-scannable by end-customers) */
  publicStatus: z.boolean().default(false),
  /** QR ticket generation & scanning */
  qrTickets: z.boolean().default(false),
})

export const ThemeSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color')
    .default('#6366f1'),
  accentColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color')
    .default('#f59e0b'),
  logoUrl: z.string().url('Must be a valid URL').optional(),
  faviconUrl: z.string().url('Must be a valid URL').optional(),
  /** Tailwind-compatible dark/light preference */
  colorScheme: z.enum(['light', 'dark', 'system']).default('light'),
})

export const AIToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  parameters: z.record(z.unknown()),
})

export const AIConfigSchema = z.object({
  /** Anthropic model id, e.g. "claude-3-5-haiku-20241022" */
  model: z.string().default('claude-3-5-haiku-20241022'),
  systemPrompt: z.string().min(1, 'systemPrompt is required when aiChat is enabled'),
  tools: z.array(AIToolSchema).default([]),
  maxTokens: z.number().positive().default(1024),
  temperature: z.number().min(0).max(1).default(0.7),
})

export const WhatsAppConfigSchema = z.object({
  phoneNumberId: z.string().min(1, 'phoneNumberId is required when whatsapp is enabled'),
  businessAccountId: z.string().min(1, 'businessAccountId is required when whatsapp is enabled'),
  /** Map of logical template name → actual Meta template name */
  templateNames: z.record(z.string()).default({}),
  /** Default language code for templates */
  defaultLanguage: z.string().default('es_AR'),
})

// ---------------------------------------------------------------------------
// Root TenantConfig schema
// ---------------------------------------------------------------------------

export const TenantConfigSchema = z
  .object({
    /** URL-safe identifier, e.g. "zenco" or "mg_masajes" */
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9_-]+$/, 'slug must be lowercase alphanumeric with underscores/hyphens'),

    /** Short display name, e.g. "Zenko" */
    name: z.string().min(1, 'name is required'),

    /** Full legal / business name */
    businessName: z.string().min(1, 'businessName is required'),

    /** Currency code (ISO 4217) */
    currency: z.string().length(3, 'currency must be a 3-letter ISO 4217 code').default('ARS'),

    /** IANA timezone identifier */
    timezone: z.string().default('America/Buenos_Aires'),

    /** BCP 47 locale tag */
    locale: z.string().default('es-AR'),

    /** Contact details */
    contactPhone: z.string().optional(),
    contactEmail: z.string().email('contactEmail must be a valid email').optional(),

    /** Owners / operators (display only) */
    owners: z.array(z.string()).default([]),

    /** Catalog of services offered */
    services: z.array(ServiceSchema).default([]),

    /** Feature flags */
    features: FeaturesSchema.default({}),

    /** Visual theme */
    theme: ThemeSchema.default({}),

    /** AI assistant config — required only when features.aiChat is true */
    ai: AIConfigSchema.optional(),

    /** WhatsApp config — required only when features.whatsapp is true */
    whatsapp: WhatsAppConfigSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.features.aiChat && !data.ai) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ai config is required when features.aiChat is true',
        path: ['ai'],
      })
    }
    if (data.features.whatsapp && !data.whatsapp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'whatsapp config is required when features.whatsapp is true',
        path: ['whatsapp'],
      })
    }
  })

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------

export type ServiceConfig = z.infer<typeof ServiceSchema>
export type FeaturesConfig = z.infer<typeof FeaturesSchema>
export type ThemeConfig = z.infer<typeof ThemeSchema>
export type AITool = z.infer<typeof AIToolSchema>
export type AIConfig = z.infer<typeof AIConfigSchema>
export type WhatsAppConfig = z.infer<typeof WhatsAppConfigSchema>
export type TenantConfig = z.infer<typeof TenantConfigSchema>

// ---------------------------------------------------------------------------
// Partial input type (before defaults are applied)
// ---------------------------------------------------------------------------

export type TenantConfigInput = z.input<typeof TenantConfigSchema>
