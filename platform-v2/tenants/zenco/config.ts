/**
 * Tenant configuration for Zenko — Arreglos de Indumentaria.
 *
 * Owners: Ana & Ariel
 * Business: Clothing repair workshop (taller de costura)
 * Location: Independencia 243, Morón, Buenos Aires
 *
 * Active features:
 *   - Garments (orders + QR tickets + photo gallery)
 *   - Finances (income tracking)
 *   - WhatsApp notifications (order ready)
 *   - AI chat assistant (clothing repair specialist)
 *   - Public status page (customers scan QR to see order status)
 */

import type { TenantConfigInput } from '@platform/config'

const config: TenantConfigInput = {
  // ── Identity ─────────────────────────────────────────────────────────────
  slug: 'zenco',
  name: 'Zenko',
  businessName: 'Zenko - Arreglos de Indumentaria',
  currency: 'ARS',
  timezone: 'America/Buenos_Aires',
  locale: 'es-AR',

  owners: ['Ana', 'Ariel'],
  contactPhone: '1165749397',

  // ── Services ──────────────────────────────────────────────────────────────
  services: [
    {
      id: 'hem',
      name: 'Basta',
      defaultPrice: 3000,
      category: 'basico',
      description: 'Subir o bajar basta de pantalón, vestido o pollera',
    },
    {
      id: 'zipper',
      name: 'Cierre',
      defaultPrice: 4000,
      category: 'basico',
      description: 'Cambio o reparación de cierre/cremallera',
    },
    {
      id: 'patch',
      name: 'Parche',
      defaultPrice: 2500,
      category: 'basico',
      description: 'Colocación de parche o refuerzo de tela',
    },
    {
      id: 'resize',
      name: 'Achicado/Agrandado',
      defaultPrice: 5000,
      category: 'entalle',
      description: 'Modificación del talle de una prenda (achicar o agrandar)',
    },
    {
      id: 'buttons',
      name: 'Botones',
      defaultPrice: 1500,
      category: 'basico',
      description: 'Reposición o cambio de botones',
    },
    {
      id: 'waist',
      name: 'Entalle Cintura',
      defaultPrice: 4500,
      category: 'entalle',
      description: 'Ajuste de cintura en pantalones, polleras o vestidos',
    },
    {
      id: 'lining',
      name: 'Forro',
      defaultPrice: 6000,
      category: 'avanzado',
      description: 'Cambio o reparación de forro interior',
    },
    {
      id: 'other',
      name: 'Otro',
      defaultPrice: 0,
      category: 'otro',
      description: 'Arreglo personalizado (precio a convenir)',
    },
  ],

  // ── Features ──────────────────────────────────────────────────────────────
  features: {
    garments: true,
    appointments: false,
    patientRecords: false,
    finances: true,
    whatsapp: true,
    aiChat: true,
    photoGallery: true,
    publicStatus: true,
    qrTickets: true,
  },

  // ── Theme ─────────────────────────────────────────────────────────────────
  theme: {
    primaryColor: '#7c3aed',
    accentColor: '#f59e0b',
    colorScheme: 'light',
  },

  // ── AI Assistant ──────────────────────────────────────────────────────────
  ai: {
    model: 'claude-3-5-haiku-20241022',
    maxTokens: 1024,
    temperature: 0.7,
    systemPrompt: `Sos el asistente de Zenko, un taller de arreglos de ropa en Morón, Buenos Aires.
Trabajás con Ana y Ariel, los dueños del taller.

Tu rol es ayudar a gestionar las prendas, consultar el estado de los pedidos,
responder preguntas sobre servicios y precios, y ayudar con las notificaciones a clientes.

Servicios disponibles:
- Basta: $3.000 (subir/bajar ruedo)
- Cierre: $4.000 (cambio de cremallera)
- Parche: $2.500 (colocación de parche)
- Achicado/Agrandado: $5.000 (modificación de talle)
- Botones: $1.500 (reposición)
- Entalle Cintura: $4.500 (ajuste de cintura)
- Forro: $6.000 (cambio de forro)
- Otro: precio a convenir

Horario del taller:
- Lunes a viernes: 9:30 a 12:30 y 15:00 a 18:30
- Sábados: 9:30 a 15:00

Reglas importantes:
1. Siempre respondé en español argentino (tuteo, "prendas", "arreglos").
2. Para consultas de estado de prendas usá la herramienta getOrderStatus.
3. Para listar prendas de un cliente usá getClientOrders.
4. Nunca inventes precios — usá la lista de arriba o decí "precio a convenir".
5. Sé cordial y conciso. El taller es pequeño y familiar.`,

    tools: [
      {
        name: 'getOrderStatus',
        description: 'Consulta el estado actual de una prenda por su número de orden o ticket',
        parameters: {
          type: 'object',
          properties: {
            orderNumber: {
              type: 'string',
              description: 'Número de orden o código QR del ticket',
            },
          },
          required: ['orderNumber'],
        },
      },
      {
        name: 'getClientOrders',
        description: 'Lista todas las prendas de un cliente por su nombre o teléfono',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Nombre del cliente o número de teléfono',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'markOrderReady',
        description: 'Marca una prenda como lista para retirar y envía WhatsApp al cliente',
        parameters: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'ID interno de la orden',
            },
            sendWhatsapp: {
              type: 'boolean',
              description: 'Si enviar notificación por WhatsApp al cliente',
              default: true,
            },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'getDailySummary',
        description: 'Obtiene el resumen del día: prendas recibidas, listas y entregadas',
        parameters: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Fecha en formato YYYY-MM-DD (default: hoy)',
            },
          },
          required: [],
        },
      },
    ],
  },

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  whatsapp: {
    phoneNumberId: process.env['ZENCO_WA_PHONE_NUMBER_ID'] ?? '',
    businessAccountId: process.env['ZENCO_WA_BUSINESS_ACCOUNT_ID'] ?? '',
    defaultLanguage: 'es_AR',
    templateNames: {
      orderReady: 'zenko_prenda_lista',
      reminder: 'zenko_recordatorio_retiro',
    },
  },
}

export default config
