/**
 * Business Configuration System
 *
 * To add a new client, create a new entry in BUSINESS_REGISTRY below.
 * Set VITE_BUSINESS=<slug> in the client's .env file.
 * No other code changes are needed.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BusinessSchedule {
  weekdays: string;
  saturdays: string;
}

export interface BusinessConfig {
  /** Internal slug used in API paths: /api/<slug>/* */
  slug: string;
  /** Display name, e.g. "Zenko" */
  name: string;
  /** Brand label shown in the sidebar/header */
  brandLabel: string;
  /** Brand suffix shown next to the label, e.g. ".arreglos" */
  brandSuffix: string;
  /** Owner / operator display name */
  ownerName: string;
  /** Greeting shown on the dashboard header */
  greeting: string;
  /** Subtitle shown below the greeting */
  subtitle: string;
  /** Currency symbol */
  currency: string;
  /** Business address (used in tickets) */
  address: string;
  /** WhatsApp contact number (digits only) */
  whatsappNumber: string;
  /** Opening hours */
  schedule: BusinessSchedule;
  /** Available repair / service types for the selector chips */
  repairTypes: string[];
  /** Order statuses with display labels and sort order */
  statuses: ReadonlyArray<{ key: string; label: string; order: number }>;
  /** Service type label (e.g. "arreglo", "masaje") — used in ticket/copy */
  serviceLabel: string;
  /** Description label for services (singular) */
  serviceDescription: string;
  /** Message sent via WhatsApp when an order is ready for pickup.
   *  Recibe items[] para personalizar segun cantidad:
   *  - 1 item:  "Tu pedido (CAMPERA) ya esta listo"
   *  - 2+ items: lista + link al detalle publico */
  whatsappReadyMsg: (clientName: string, items: string[], orderNumber?: number) => string;
  /** Message sent via WhatsApp as a reminder for uncollected orders */
  whatsappReminderMsg: (clientName: string, serviceName: string) => string;
  /** Ticket header title (usually the business name in uppercase) */
  ticketTitle: string;
  /** Ticket subtitle line (e.g. "Arreglos de Ropa") */
  ticketSubtitle: string;
  /** Fine print shown at the bottom of the ticket */
  ticketFooterLines: string[];
}

// ─── Zenko ───────────────────────────────────────────────────────────────────

const zencoConfig: BusinessConfig = {
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
  repairTypes: ['dobladillo', 'cierre', 'entalle', 'tela', 'diseño'],
  statuses: [
    { key: 'recibido',   label: 'Recibido',   order: 2 },
    { key: 'en_proceso', label: 'En Proceso', order: 1 },
    { key: 'listo',      label: 'Listo',      order: 0 },
    { key: 'entregado',  label: 'Entregado',  order: 3 },
  ] as const,
  serviceLabel: 'arreglo',
  serviceDescription: 'Arreglos de Ropa',
  whatsappReadyMsg: (_clientName: string, items: string[], orderNumber?: number) => {
    const lines: string[] = [`Hola 👋🏻`];
    if (items.length === 1) {
      lines.push(`Tu pedido (${items[0]}) ya está listo para retirar 🦊`);
    } else if (items.length > 1) {
      lines.push(`Tu pedido en Zenko ya está listo para retirar 🦊`);
      lines.push(`Incluye: ${items.join(', ')}`);
      if (orderNumber && typeof window !== 'undefined') {
        lines.push(`Ver detalle: ${window.location.origin}/?view=status&order=${orderNumber}`);
      }
    } else {
      lines.push(`Tu pedido en Zenko ya está listo para retirar 🦊`);
    }
    lines.push(``);
    lines.push(`🕘 Lun a Vie: ${zencoConfig.schedule.weekdays}`);
    lines.push(`🕘 Sáb: ${zencoConfig.schedule.saturdays}`);
    lines.push(``);
    lines.push(`¡Gracias!`);
    return lines.join('\n');
  },
  whatsappReminderMsg: (clientName: string, serviceName: string) =>
    `Hola ${clientName}, te recordamos que tu prenda "${serviceName}" está lista para retirar. ¡Te esperamos! 🧵`,
  ticketTitle: 'ZENKO',
  ticketSubtitle: 'Arreglos de Ropa',
  ticketFooterLines: [
    'Pasados los 90 dias sin retirar el local dispone de las prendas.',
    'Una vez finalizado el arreglo se avisara via',
    'mensaje de WhatsApp que esta listo para retirarse.',
  ],
};

// ─── MG Masajes (example second business) ────────────────────────────────────

const mgMasajesConfig: BusinessConfig = {
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
  repairTypes: ['relajante', 'deportivo', 'descontracturante', 'reflexología'],
  statuses: [
    { key: 'recibido',   label: 'Reservado',  order: 2 },
    { key: 'en_proceso', label: 'En Curso',   order: 1 },
    { key: 'listo',      label: 'Completado', order: 0 },
    { key: 'entregado',  label: 'Pagado',     order: 3 },
  ] as const,
  serviceLabel: 'turno',
  serviceDescription: 'Masajes y Bienestar',
  whatsappReadyMsg: (clientName: string, items: string[], _orderNumber?: number) =>
    `Hola ${clientName} 👋\n` +
    `Te confirmamos tu turno de "${items[0] || 'masaje'}" en MG Masajes.\n\n` +
    `Horario: Lunes a viernes: ${mgMasajesConfig.schedule.weekdays} | Sáb: ${mgMasajesConfig.schedule.saturdays}\n\n` +
    `¡Te esperamos!`,
  whatsappReminderMsg: (clientName: string, serviceName: string) =>
    `Hola ${clientName}, te recordamos tu turno de "${serviceName}". ¡Te esperamos! 💆`,
  ticketTitle: 'MG MASAJES',
  ticketSubtitle: 'Masajes y Bienestar',
  ticketFooterLines: [
    'Agradecemos tu puntualidad.',
    'Cancelaciones con 24 hs de anticipación.',
  ],
};

// ─── Registry ─────────────────────────────────────────────────────────────────

const BUSINESS_REGISTRY: Record<string, BusinessConfig> = {
  zenco: zencoConfig,
  mg_masajes: mgMasajesConfig,
};

// ─── Loader ──────────────────────────────────────────────────────────────────

/**
 * Returns the active BusinessConfig.
 * Resolution order:
 *   1. VITE_BUSINESS env var  →  looks up the registry
 *   2. Falls back to "zenco"
 *
 * Throws if VITE_BUSINESS is set to an unknown slug, so misconfiguration
 * is caught at startup rather than silently producing broken behaviour.
 */
function loadBusinessConfig(): BusinessConfig {
  const slug = import.meta.env.VITE_BUSINESS as string | undefined;

  if (!slug) return zencoConfig; // default

  const config = BUSINESS_REGISTRY[slug];
  if (!config) {
    const known = Object.keys(BUSINESS_REGISTRY).join(', ');
    throw new Error(
      `[config] Unknown VITE_BUSINESS="${slug}". Known slugs: ${known}`
    );
  }

  return config;
}

// ─── Singleton export ────────────────────────────────────────────────────────

/**
 * The active business configuration. Import this anywhere you need
 * business-specific values.
 *
 * @example
 * import { BUSINESS } from '../config/business';
 * console.log(BUSINESS.name);         // "Zenko"
 * console.log(BUSINESS.slug);         // "zenco"
 */
export const BUSINESS: BusinessConfig = loadBusinessConfig();
