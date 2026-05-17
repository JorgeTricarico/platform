import type { TenantConfig } from '@platform/types';
import { DEFAULT_FEATURE_FLAGS } from '@platform/types';

// ─── Tenant Definitions ───────────────────────────────────────────────────────

const zencoConfig: TenantConfig = {
  slug: 'zenco',
  name: 'Zenko',
  brandLabel: 'Zenko',
  brandSuffix: '.arg',
  ownerName: 'Ana & Ariel',
  greeting: 'Hola, Ana',
  subtitle: 'Aquí tienes el resumen de tu taller al día de hoy.',
  currency: '$',
  address: 'Independencia 243, Morón',
  whatsappNumber: '1165749397',
  schedule: {
    weekdays: '9:30 a 12:30 / 15:00 a 18:30',
    saturdays: '9:30 a 15:00',
  },
  serviceTypes: ['dobladillo', 'cierre', 'entalle', 'tela', 'diseño'],
  statuses: [
    { key: 'recibido',   label: 'Recibido',   order: 2 },
    { key: 'en_proceso', label: 'En Proceso', order: 1 },
    { key: 'listo',      label: 'Listo',      order: 0 },
    { key: 'entregado',  label: 'Entregado',  order: 3 },
  ] as const,
  serviceLabel: 'arreglo',
  serviceDescription: 'Arreglos de Ropa',
  whatsappTemplates: {
    ready: (_clientName: string, _serviceName: string) =>
      `Hola!\n` +
      `Te escribimos desde Zenko - Taller de arreglos de ropa para avisarte que tus arreglos ya se encuentran finalizados y disponibles para retirar.\n\n` +
      `Horario de atencion:\n` +
      `- Lunes a viernes: 9:30 a 12:30 / 15:00 a 18:30\n` +
      `- Sabados: 9:30 a 15:00\n\n` +
      `Muchas gracias!`,
    reminder: (clientName: string, serviceName: string) =>
      `Hola ${clientName}, te recordamos que tu prenda "${serviceName}" está lista para retirar. ¡Te esperamos! 🧵`,
  },
  ticket: {
    title: 'ZENKO',
    subtitle: 'Arreglos de Ropa',
    footerLines: [
      'Pasados los 90 dias sin retirar el local dispone de las prendas.',
      'Una vez finalizado el arreglo se avisara via',
      'mensaje de WhatsApp que esta listo para retirarse.',
    ],
  },
  features: {
    ...DEFAULT_FEATURE_FLAGS,
    orders: true,
    finance: true,
    whatsappNotifications: true,
    qrCodes: true,
    aiChat: true,
    offlineSync: true,
  },
  theme: {
    primaryHsl: '262 80% 50%',
    accentHsl: '262 60% 40%',
  },
};

const mgMasajesConfig: TenantConfig = {
  slug: 'mg_masajes',
  name: 'MG Masajes',
  brandLabel: 'MG',
  brandSuffix: '.masajes',
  ownerName: 'María García',
  greeting: 'Hola, María',
  subtitle: 'Aquí tienes el resumen de tus turnos al día de hoy.',
  currency: '$',
  address: 'Av. Rivadavia 1234, CABA',
  whatsappNumber: '1100000000',
  schedule: {
    weekdays: '10:00 a 19:00',
    saturdays: '10:00 a 14:00',
  },
  serviceTypes: ['relajante', 'deportivo', 'descontracturante', 'reflexología'],
  statuses: [
    { key: 'pendiente',   label: 'Pendiente',   order: 0 },
    { key: 'confirmado',  label: 'Confirmado',  order: 1 },
    { key: 'completado',  label: 'Completado',  order: 2 },
    { key: 'cancelado',   label: 'Cancelado',   order: 3 },
  ] as const,
  serviceLabel: 'turno',
  serviceDescription: 'Masajes y Bienestar',
  whatsappTemplates: {
    ready: (clientName: string, serviceName: string) =>
      `Hola ${clientName} 👋\n` +
      `Te confirmamos tu turno de "${serviceName}" en MG Masajes.\n\n` +
      `Horario: Lunes a viernes: 10:00 a 19:00 | Sáb: 10:00 a 14:00\n\n` +
      `¡Te esperamos!`,
    reminder: (clientName: string, serviceName: string) =>
      `Hola ${clientName}, te recordamos tu turno de "${serviceName}". ¡Te esperamos! 💆`,
  },
  ticket: {
    title: 'MG MASAJES',
    subtitle: 'Masajes y Bienestar',
    footerLines: [
      'Agradecemos tu puntualidad.',
      'Cancelaciones con 24 hs de anticipación.',
    ],
  },
  features: {
    ...DEFAULT_FEATURE_FLAGS,
    appointments: true,
    finance: true,
    patientRecords: true,
    whatsappNotifications: true,
    aiChat: true,
    offlineSync: true,
  },
  theme: {
    primaryHsl: '168 60% 40%',
    accentHsl: '168 40% 30%',
  },
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const TENANT_REGISTRY: Readonly<Record<string, TenantConfig>> = {
  zenco: zencoConfig,
  mg_masajes: mgMasajesConfig,
};

// ─── Accessors ────────────────────────────────────────────────────────────────

/**
 * Look up a tenant config by slug.
 * Returns undefined if the slug is not registered.
 */
export function getTenantConfig(slug: string): TenantConfig | undefined {
  return TENANT_REGISTRY[slug];
}

/**
 * Look up a tenant config by slug or throw.
 * Use this when the slug is expected to be valid (e.g. after middleware validation).
 */
export function requireTenantConfig(slug: string): TenantConfig {
  const config = getTenantConfig(slug);
  if (!config) {
    const known = Object.keys(TENANT_REGISTRY).join(', ');
    throw new Error(
      `[config] Unknown tenant slug "${slug}". Registered slugs: ${known}`,
    );
  }
  return config;
}

/**
 * List all registered tenant slugs.
 */
export function listTenantSlugs(): string[] {
  return Object.keys(TENANT_REGISTRY);
}

/**
 * Validate that a value is a known tenant slug.
 */
export function isValidTenantSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && slug in TENANT_REGISTRY;
}

/**
 * Validate a TenantConfig object has all required fields.
 * Throws with a descriptive error if any field is missing.
 */
export function validateTenantConfig(config: unknown): asserts config is TenantConfig {
  if (typeof config !== 'object' || config === null) {
    throw new Error('[config] Tenant config must be an object');
  }
  const c = config as Record<string, unknown>;
  const required = [
    'slug', 'name', 'brandLabel', 'brandSuffix', 'ownerName',
    'greeting', 'subtitle', 'currency', 'address', 'whatsappNumber',
    'schedule', 'serviceTypes', 'statuses', 'serviceLabel',
    'serviceDescription', 'whatsappTemplates', 'ticket', 'features', 'theme',
  ];
  for (const key of required) {
    if (c[key] === undefined || c[key] === null) {
      throw new Error(`[config] Tenant config missing required field: "${key}"`);
    }
  }
}
