/**
 * Tenant configuration for MG Masajes & Bienestar.
 *
 * Owner: Damian
 * Business: Massage therapy and wellness center
 *
 * Active features:
 *   - Appointments (booking, calendar, reminders)
 *   - Patient Records (clinical history per client)
 *   - Finances (income tracking)
 *   - WhatsApp notifications (appointment reminders and confirmations)
 *   - AI chat assistant (wellness and booking assistant)
 */

import type { TenantConfigInput } from '@platform/config'

const config: TenantConfigInput = {
  // ── Identity ─────────────────────────────────────────────────────────────
  slug: 'mg_masajes',
  name: 'MG Masajes',
  businessName: 'MG Masajes & Bienestar',
  currency: 'ARS',
  timezone: 'America/Buenos_Aires',
  locale: 'es-AR',

  owners: ['Damian'],
  contactPhone: '1100000000',

  // ── Services ──────────────────────────────────────────────────────────────
  services: [
    {
      id: 'relaxing',
      name: 'Masaje Relajante',
      defaultPrice: 8000,
      duration: 60,
      category: 'relajacion',
      description: 'Técnicas suaves para reducir el estrés y promover la relajación profunda',
    },
    {
      id: 'decontracting',
      name: 'Masaje Descontracturante',
      defaultPrice: 10000,
      duration: 60,
      category: 'terapeutico',
      description: 'Trabajo sobre contracturas musculares y nudos de tensión',
    },
    {
      id: 'sports',
      name: 'Masaje Deportivo',
      defaultPrice: 10000,
      duration: 45,
      category: 'deportivo',
      description: 'Preparación pre-actividad y recuperación post-actividad física',
    },
    {
      id: 'lymphatic',
      name: 'Drenaje Linfático',
      defaultPrice: 12000,
      duration: 75,
      category: 'terapeutico',
      description: 'Técnica de estimulación del sistema linfático, reduce retención de líquidos',
    },
    {
      id: 'cranial',
      name: 'Craneosacral',
      defaultPrice: 9000,
      duration: 50,
      category: 'terapeutico',
      description: 'Terapia craneosacral para el equilibrio del sistema nervioso central',
    },
    {
      id: 'combo',
      name: 'Combo Relax',
      defaultPrice: 15000,
      duration: 90,
      category: 'paquete',
      description: 'Masaje relajante + aromaterapia + piedras calientes',
    },
    {
      id: 'reflexology',
      name: 'Reflexología',
      defaultPrice: 7000,
      duration: 45,
      category: 'terapeutico',
      description: 'Estimulación de puntos reflejos en pies y manos',
    },
    {
      id: 'prenatal',
      name: 'Masaje Prenatal',
      defaultPrice: 9000,
      duration: 60,
      category: 'especial',
      description: 'Masaje adaptado para embarazadas, a partir del 2do trimestre',
    },
  ],

  // ── Features ──────────────────────────────────────────────────────────────
  features: {
    garments: false,
    appointments: true,
    patientRecords: true,
    finances: true,
    whatsapp: true,
    aiChat: true,
    photoGallery: false,
    publicStatus: false,
    qrTickets: false,
  },

  // ── Theme ─────────────────────────────────────────────────────────────────
  theme: {
    primaryColor: '#0d9488', // teal-600
    accentColor: '#f59e0b', // amber-500
    colorScheme: 'light',
  },

  // ── AI Assistant ──────────────────────────────────────────────────────────
  ai: {
    model: 'claude-3-5-haiku-20241022',
    maxTokens: 1024,
    temperature: 0.7,
    systemPrompt: `Sos el asistente de MG Masajes & Bienestar, el centro de masajes y terapias de Damian.
Ayudás a gestionar turnos, fichas de pacientes y comunicaciones con clientes.

Servicios disponibles:
- Masaje Relajante: $8.000 (60 min)
- Masaje Descontracturante: $10.000 (60 min)
- Masaje Deportivo: $10.000 (45 min)
- Drenaje Linfático: $12.000 (75 min)
- Craneosacral: $9.000 (50 min)
- Combo Relax: $15.000 (90 min)
- Reflexología: $7.000 (45 min)
- Masaje Prenatal: $9.000 (60 min)

Siempre respondé con calidez y profesionalismo. Usá español argentino.
Para reservas y cancelaciones, usá las herramientas disponibles.`,

    tools: [
      {
        name: 'getAvailableSlots',
        description: 'Consulta los horarios disponibles para un servicio en una fecha',
        parameters: {
          type: 'object',
          properties: {
            serviceId: { type: 'string' },
            date: { type: 'string', description: 'YYYY-MM-DD' },
          },
          required: ['serviceId', 'date'],
        },
      },
      {
        name: 'bookAppointment',
        description: 'Reserva un turno para un cliente',
        parameters: {
          type: 'object',
          properties: {
            clientId: { type: 'string' },
            serviceId: { type: 'string' },
            datetime: { type: 'string', description: 'ISO 8601' },
            notes: { type: 'string' },
          },
          required: ['clientId', 'serviceId', 'datetime'],
        },
      },
      {
        name: 'cancelAppointment',
        description: 'Cancela un turno existente',
        parameters: {
          type: 'object',
          properties: {
            appointmentId: { type: 'string' },
            reason: { type: 'string' },
          },
          required: ['appointmentId'],
        },
      },
      {
        name: 'getClientHistory',
        description: 'Obtiene el historial de turnos y ficha clínica de un cliente',
        parameters: {
          type: 'object',
          properties: {
            clientId: { type: 'string' },
          },
          required: ['clientId'],
        },
      },
    ],
  },

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  ...(process.env['MG_WA_PHONE_NUMBER_ID'] ? {
    whatsapp: {
      phoneNumberId: process.env['MG_WA_PHONE_NUMBER_ID']!,
      businessAccountId: process.env['MG_WA_BUSINESS_ACCOUNT_ID'] ?? '',
      webhookVerifyToken: process.env['MG_WA_WEBHOOK_TOKEN'] ?? '',
      accessToken: process.env['MG_WA_ACCESS_TOKEN'] ?? '',
      defaultLanguage: 'es_AR',
      templateNames: {
        appointmentConfirmation: 'mg_turno_confirmado',
        appointmentReminder: 'mg_recordatorio_turno',
        appointmentCancellation: 'mg_turno_cancelado',
      },
    },
  } : {}),
}

export default config
