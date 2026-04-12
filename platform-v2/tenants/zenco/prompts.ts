/**
 * AI system prompts and tool definitions for the Zenko chat assistant.
 *
 * The assistant helps Ana & Ariel manage the clothing repair workshop.
 * It can look up orders, mark items as ready, and send WhatsApp notifications.
 */

import type { AITool } from '@platform/config'

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

export const ZENCO_SYSTEM_PROMPT = `Sos el asistente inteligente de Zenko, un taller de arreglos de ropa en Morón, Buenos Aires.
Trabajás con Ana y Ariel, los dueños del taller desde hace más de 10 años.

## Tu personalidad
- Cordial, directo y eficiente
- Usás español argentino (tuteo, vocabulario local)
- Conocés el oficio: sabés de telas, costuras, arreglos y plazos
- Cuando no sabés algo, lo decís sin vueltas

## Contexto del negocio
Zenko es un taller familiar de arreglos de ropa. Las prendas ingresan con un número de orden,
se fotografían, se reparan y se notifica al cliente por WhatsApp cuando están listas.
Los clientes también pueden escanear el QR de su ticket para ver el estado.

## Servicios y precios
| Servicio             | Precio base |
|----------------------|-------------|
| Basta                | $3.000      |
| Cierre               | $4.000      |
| Parche               | $2.500      |
| Achicado/Agrandado   | $5.000      |
| Botones              | $1.500      |
| Entalle Cintura      | $4.500      |
| Forro                | $6.000      |
| Otro (personalizado) | A convenir  |

## Horarios
- Lunes a viernes: 9:30 a 12:30 / 15:00 a 18:30
- Sábados: 9:30 a 15:00

## Política de prendas abandonadas
Las prendas no retiradas en 90 días quedan a disposición del taller.
Avisá a los clientes con anticipación si una prenda lleva más de 60 días.

## Reglas de uso de herramientas
1. Antes de marcar una prenda como lista, confirmar con el usuario.
2. Antes de enviar un WhatsApp, mostrar el mensaje al usuario para aprobar.
3. Para buscar órdenes usar getClientOrders si el usuario da nombre/teléfono,
   o getOrderStatus si da número de orden/QR.
4. Al crear un resumen diario, formatear con emojis y secciones claras.

## Formato de respuestas
- Para listas de prendas: tabla con columnas (N°, Cliente, Servicio, Estado, Días)
- Para confirmaciones: mensaje breve con ✅ al inicio
- Para errores o dudas: mensaje con ⚠️ al inicio
- Nunca uses markdown de encabezados (##) en respuestas al usuario final`

// ---------------------------------------------------------------------------
// Short prompt for contexts where token budget is tight (e.g. streaming)
// ---------------------------------------------------------------------------

export const ZENCO_SYSTEM_PROMPT_COMPACT = `Sos el asistente de Zenko (taller de arreglos de ropa, Morón, Buenos Aires).
Ayudás a Ana y Ariel con órdenes, estados y WhatsApp.
Respondé siempre en español argentino. Usá las herramientas disponibles para consultar datos reales.
Nunca inventes precios — preguntá o decí "a convenir".`

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export const ZENCO_TOOLS: AITool[] = [
  {
    name: 'getOrderStatus',
    description:
      'Consulta el estado actual de una prenda por su número de orden o código de ticket QR. ' +
      'Devuelve: número, cliente, servicio, estado, fecha ingreso, precio, fotos.',
    parameters: {
      type: 'object',
      properties: {
        orderNumber: {
          type: 'string',
          description: 'Número de orden (ej: "ORD-2024-001") o código QR escaneado',
        },
      },
      required: ['orderNumber'],
    },
  },
  {
    name: 'getClientOrders',
    description:
      'Lista todas las órdenes de un cliente buscando por nombre o teléfono. ' +
      'Útil para cuando un cliente pregunta "¿cómo están mis prendas?"',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Nombre completo del cliente o número de teléfono (sin 0 ni 15)',
        },
        status: {
          type: 'string',
          enum: ['recibido', 'en_proceso', 'listo', 'entregado', 'all'],
          description: 'Filtrar por estado. Default: "all"',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'markOrderReady',
    description:
      'Marca una prenda como "lista para retirar". ' +
      'Opcionalmente envía notificación por WhatsApp al cliente. ' +
      'IMPORTANTE: pedí confirmación antes de usar esta herramienta.',
    parameters: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'ID interno de la orden (UUID)',
        },
        sendWhatsapp: {
          type: 'boolean',
          description: 'Si enviar mensaje de WhatsApp al cliente. Default: false',
        },
        customMessage: {
          type: 'string',
          description: 'Mensaje personalizado para el WhatsApp (opcional, si no se usa el template)',
        },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'getDailySummary',
    description:
      'Devuelve el resumen del día para el taller: ' +
      'prendas ingresadas, en proceso, listas para retirar, entregadas, ' +
      'ingresos del día y prendas próximas a vencer (más de 60 días).',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Fecha en formato YYYY-MM-DD. Si se omite, usa la fecha de hoy.',
        },
      },
      required: [],
    },
  },
  {
    name: 'searchClients',
    description: 'Busca clientes por nombre, teléfono o email. Útil para autocompletar.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Texto a buscar',
        },
        limit: {
          type: 'number',
          description: 'Máximo de resultados. Default: 10',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'getOverdueOrders',
    description:
      'Lista las prendas que llevan más de N días sin ser retiradas. ' +
      'Útil para gestionar el aviso a clientes con prendas antiguas.',
    parameters: {
      type: 'object',
      properties: {
        daysThreshold: {
          type: 'number',
          description: 'Mínimo de días de antigüedad. Default: 60',
        },
        status: {
          type: 'string',
          enum: ['listo', 'en_proceso', 'recibido'],
          description: 'Estado de las prendas a filtrar. Default: "listo"',
        },
      },
      required: [],
    },
  },
  {
    name: 'sendWhatsappNotification',
    description:
      'Envía un mensaje de WhatsApp a un cliente. ' +
      'SIEMPRE mostrar el mensaje al usuario antes de enviar y pedir confirmación.',
    parameters: {
      type: 'object',
      properties: {
        clientPhone: {
          type: 'string',
          description: 'Número de teléfono del cliente (sin 0 ni 15, con código de área)',
        },
        message: {
          type: 'string',
          description: 'Texto del mensaje a enviar',
        },
        orderId: {
          type: 'string',
          description: 'ID de la orden asociada (para el registro de auditoría)',
        },
      },
      required: ['clientPhone', 'message'],
    },
  },
]
