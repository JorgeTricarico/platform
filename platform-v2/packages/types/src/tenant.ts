// ─── Feature Flags ───────────────────────────────────────────────────────────

export interface FeatureFlags {
  /** Show orders / garment management module */
  orders: boolean;
  /** Show appointments / booking module */
  appointments: boolean;
  /** Show finance / income-expenses module */
  finance: boolean;
  /** Show patient records / clinical history */
  patientRecords: boolean;
  /** Show WhatsApp notification actions */
  whatsappNotifications: boolean;
  /** Enable QR code generation for orders */
  qrCodes: boolean;
  /** Enable AI chat assistant */
  aiChat: boolean;
  /** Enable offline PWA sync queue */
  offlineSync: boolean;
  /** Enable dark mode toggle */
  darkMode: boolean;
  /** Enable multi-location support */
  multiLocation: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  orders: false,
  appointments: false,
  finance: false,
  patientRecords: false,
  whatsappNotifications: false,
  qrCodes: false,
  aiChat: false,
  offlineSync: true,
  darkMode: true,
  multiLocation: false,
};

// ─── Business Schedule ───────────────────────────────────────────────────────

export interface BusinessSchedule {
  weekdays: string;
  saturdays: string;
  sundays?: string;
}

// ─── Theme ───────────────────────────────────────────────────────────────────

export interface TenantTheme {
  /** Primary brand color (CSS hsl string like "262 80% 50%") */
  primaryHsl: string;
  /** Accent color */
  accentHsl?: string;
  /** Logo URL or path relative to tenant assets */
  logoUrl?: string;
  /** Favicon URL */
  faviconUrl?: string;
  /** Custom CSS variables override (key = CSS var name without --, value = CSS value) */
  cssVars?: Record<string, string>;
}

// ─── Tenant / Business Config ────────────────────────────────────────────────

export interface TenantConfig {
  /** Unique slug, used in API paths: /api/<slug>/* and IndexedDB namespacing */
  slug: string;
  /** Human-readable display name, e.g. "Zenko" */
  name: string;
  /** Short brand label shown in sidebar/header */
  brandLabel: string;
  /** Brand suffix shown after the label, e.g. ".arreglos" */
  brandSuffix: string;
  /** Owner / operator display name */
  ownerName: string;
  /** Greeting message on the dashboard */
  greeting: string;
  /** Subtitle below the greeting */
  subtitle: string;
  /** Currency symbol */
  currency: string;
  /** Physical address */
  address: string;
  /** WhatsApp contact number (digits only, no + or spaces) */
  whatsappNumber: string;
  /** Opening hours */
  schedule: BusinessSchedule;
  /** Available service / repair types */
  serviceTypes: string[];
  /** Statuses with display labels and sort order */
  statuses: ReadonlyArray<{ key: string; label: string; order: number }>;
  /** Garment order statuses with id/color/icon (platform-v2 multi-tenant config) */
  coloredStatuses?: Array<{ id: string; label: string; color: string; icon?: string }>;
  /** Singular service label (e.g. "arreglo", "turno") */
  serviceLabel: string;
  /** Service description for ticket subtitles */
  serviceDescription: string;
  /** WhatsApp message templates */
  whatsappTemplates: {
    ready: (clientName: string, serviceName: string) => string;
    reminder: (clientName: string, serviceName: string) => string;
  };
  /** Ticket / receipt configuration */
  ticket: {
    title: string;
    subtitle: string;
    footerLines: string[];
  };
  /** Feature flags for this tenant */
  features: FeatureFlags;
  /** Visual theme configuration */
  theme: TenantTheme;
}

// ─── Business Config (simplified alias used in UI) ───────────────────────────

/** @deprecated Prefer TenantConfig — BusinessConfig is a compatibility alias */
export type BusinessConfig = TenantConfig;
