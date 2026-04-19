/**
 * AI system prompts and tool definitions for the MG Masajes chat assistant.
 *
 * The assistant helps Damian manage appointments, patient records,
 * and client communications for the wellness center.
 */

import type { AITool } from '@platform/config'

// ---------------------------------------------------------------------------
// System prompt (full version)
// ---------------------------------------------------------------------------

export const MG_MASAJES_SYSTEM_PROMPT = `Sos el asistente de MG Masajes & Bienestar, el centro de masajes y terapias de Damian,
en Buenos Aires.

## Tu personalidad
- Cálido, profesional y empático
- Usás español argentino (tuteo, vocabulario cuidadoso con la salud)
- Conocés técnicas de masajes, contraindicaciones y bienestar
- Manejás el consultorio con discreción — la info de los pacientes es confidencial

## Contexto del negocio
MG Masajes es un espacio de bienestar unipersonal. Damian atiende con turno previo.
Los clientes pueden pedir turno, reprogramar o cancelar. Damian lleva fichas clínicas
con historial de sesiones, técnicas aplicadas y observaciones.

## Servicios y precios
| Servicio                | Precio   | Duración |
|-------------------------|----------|----------|
| Masaje Relajante        | $8.000   | 60 min   |
| Masaje Descontracturante| $10.000  | 60 min   |
| Masaje Deportivo        | $10.000  | 45 min   |
| Drenaje Linfático       | $12.000  | 75 min   |
| Craneosacral            | $9.000   | 50 min   |
| Combo Relax             | $15.000  | 90 min   |
| Reflexología            | $7.000   | 45 min   |
| Masaje Prenatal         | $9.000   | 60 min   |

## Política de cancelaciones
Cancelaciones con menos de 24 hs de anticipación pueden generar un cargo del 50%.

## Reglas de uso de herramientas
1. Para verificar disponibilidad: getAvailableSlots antes de confirmar un turno.
2. Para reservar: bookAppointment — siempre confirmar con el usuario antes.
3. Para cancelar: cancelAppointment — siempre confirmar con el usuario antes.
4. Para consultar historial: getClientHistory — solo si Damian lo solicita explícitamente.
5. Para WhatsApp: mostrar el mensaje y pedir aprobación antes de enviar.
6. Nunca compartas información médica de un paciente por error.

## Contraindicaciones comunes a mencionar
Si un cliente menciona embarazo de menos de 12 semanas, trombosis activa, fiebre,
heridas abiertas o problemas cardíacos graves, sugerí consultar con médico primero.
El masaje prenatal solo a partir del 2do trimestre.

## Formato de respuestas
- Horarios disponibles: lista con bullets (fecha + hora + servicio)
- Confirmaciones de turno: mensaje con ✅ + datos del turno
- Cancelaciones: mensaje con ❌ + próximos pasos
- Historial del cliente: tabla con sesiones (fecha, servicio, observaciones)
- Siempre terminá con una frase amable y profesional`

// ---------------------------------------------------------------------------
// Short prompt for token-constrained contexts
// ---------------------------------------------------------------------------

export const MG_MASAJES_SYSTEM_PROMPT_COMPACT = `Sos el asistente de MG Masajes & Bienestar (Damian).
Gestionás turnos, fichas y comunicaciones. Respondé en español argentino con calidez.
Usá las herramientas para leer datos reales. Pedí confirmación antes de modificar o enviar mensajes.`

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export const MG_MASAJES_TOOLS: AITool[] = [
  {
    name: 'getAvailableSlots',
    description:
      'Consulta los horarios disponibles para agendar un turno. ' +
      'Retorna una lista de franjas horarias libres para el servicio y fecha indicados.',
    parameters: {
      type: 'object',
      properties: {
        serviceId: {
          type: 'string',
          description:
            'ID del servicio (relaxing, decontracting, sports, lymphatic, cranial, combo, reflexology, prenatal)',
        },
        date: {
          type: 'string',
          description: 'Fecha en formato YYYY-MM-DD',
        },
        daysAhead: {
          type: 'number',
          description: 'Si no se especifica fecha, buscar en los próximos N días. Default: 7',
        },
      },
      required: ['serviceId'],
    },
  },
  {
    name: 'bookAppointment',
    description:
      'Reserva un turno para un cliente en el horario indicado. ' +
      'IMPORTANTE: verificar disponibilidad con getAvailableSlots primero, ' +
      'y confirmar los datos con el usuario antes de ejecutar.',
    parameters: {
      type: 'object',
      properties: {
        clientId: {
          type: 'string',
          description: 'ID del cliente (UUID)',
        },
        serviceId: {
          type: 'string',
          description: 'ID del servicio',
        },
        datetime: {
          type: 'string',
          description: 'Fecha y hora en formato ISO 8601 (ej: "2025-06-15T10:00:00")',
        },
        notes: {
          type: 'string',
          description: 'Observaciones o indicaciones especiales del cliente (opcional)',
        },
        sendConfirmation: {
          type: 'boolean',
          description: 'Enviar WhatsApp de confirmación al cliente. Default: true',
        },
      },
      required: ['clientId', 'serviceId', 'datetime'],
    },
  },
  {
    name: 'rescheduleAppointment',
    description:
      'Reprograma un turno existente a un nuevo horario. ' +
      'Pedí confirmación al usuario antes de ejecutar.',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: {
          type: 'string',
          description: 'ID del turno a reprogramar',
        },
        newDatetime: {
          type: 'string',
          description: 'Nueva fecha y hora en formato ISO 8601',
        },
        reason: {
          type: 'string',
          description: 'Motivo del cambio (para el registro)',
        },
        notifyClient: {
          type: 'boolean',
          description: 'Enviar WhatsApp al cliente con el nuevo horario. Default: true',
        },
      },
      required: ['appointmentId', 'newDatetime'],
    },
  },
  {
    name: 'cancelAppointment',
    description:
      'Cancela un turno. Pedí confirmación al usuario antes de ejecutar. ' +
      'Si aplica política de cancelación tardía, informar al usuario.',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: {
          type: 'string',
          description: 'ID del turno a cancelar',
        },
        reason: {
          type: 'string',
          description: 'Motivo de la cancelación',
        },
        notifyClient: {
          type: 'boolean',
          description: 'Enviar WhatsApp al cliente notificando la cancelación. Default: true',
        },
        applyCancellationFee: {
          type: 'boolean',
          description: 'Aplicar cargo por cancelación tardía (< 24 hs). Default: false',
        },
      },
      required: ['appointmentId'],
    },
  },
  {
    name: 'getClientHistory',
    description:
      'Obtiene el historial completo de sesiones y ficha clínica de un cliente. ' +
      'Incluye: sesiones pasadas, técnicas usadas, observaciones, datos de salud relevantes.',
    parameters: {
      type: 'object',
      properties: {
        clientId: {
          type: 'string',
          description: 'ID del cliente',
        },
        limit: {
          type: 'number',
          description: 'Número máximo de sesiones a retornar. Default: 10',
        },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'getTodaySchedule',
    description:
      'Devuelve la agenda completa del día indicado: turnos confirmados, cancelados y libres. ' +
      'Incluye nombre del cliente, servicio y duración.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Fecha en formato YYYY-MM-DD. Default: hoy',
        },
      },
      required: [],
    },
  },
  {
    name: 'searchClients',
    description: 'Busca clientes por nombre, teléfono o email.',
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
    name: 'sendWhatsappMessage',
    description:
      'Envía un mensaje de WhatsApp al cliente. ' +
      'SIEMPRE mostrar el texto al usuario y pedir aprobación antes de enviar.',
    parameters: {
      type: 'object',
      properties: {
        clientPhone: {
          type: 'string',
          description: 'Teléfono del cliente (sin 0 ni 15)',
        },
        message: {
          type: 'string',
          description: 'Texto del mensaje',
        },
        templateName: {
          type: 'string',
          description:
            'Nombre del template de Meta a usar (alternativo al mensaje libre). ' +
            'Opciones: mg_turno_confirmado, mg_recordatorio_turno, mg_turno_cancelado',
        },
        appointmentId: {
          type: 'string',
          description: 'ID del turno asociado (para el registro)',
        },
      },
      required: ['clientPhone', 'message'],
    },
  },
  {
    name: 'addSessionNote',
    description:
      'Agrega observaciones/notas a la ficha del cliente después de una sesión. ' +
      'Solo Damian puede agregar notas.',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: {
          type: 'string',
          description: 'ID del turno al que corresponden las notas',
        },
        notes: {
          type: 'string',
          description: 'Observaciones clínicas de la sesión',
        },
        techniqueUsed: {
          type: 'string',
          description: 'Técnica o variante aplicada (para el historial)',
        },
        nextSessionRecommendation: {
          type: 'string',
          description: 'Recomendación para la próxima sesión (optional)',
        },
      },
      required: ['appointmentId', 'notes'],
    },
  },
]
