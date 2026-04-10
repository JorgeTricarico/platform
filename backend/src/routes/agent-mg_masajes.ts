import { Router } from 'express';
import { prisma } from '../db.js';
import { chatWithFallback } from '../services/ai-chat.js';
import { DAMIAN_CONFIG } from '../config/mg_masajes.js';

const router = Router();

const SYSTEM_PROMPT = DAMIAN_CONFIG.agent.systemPrompt;

const tools: any[] = [
  {
    functionDeclarations: [
      {
        name: 'search_patients',
        description: 'Busca pacientes por nombre o telefono',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'Nombre o telefono del paciente' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_patient_history',
        description: 'Obtiene el historial clinico completo de un paciente por su ID',
        parameters: {
          type: 'OBJECT',
          properties: {
            clientId: { type: 'STRING', description: 'ID del paciente' },
          },
          required: ['clientId'],
        },
      },
      {
        name: 'save_patient_record',
        description: 'Guarda una nueva ficha clinica para un paciente',
        parameters: {
          type: 'OBJECT',
          properties: {
            clientId: { type: 'STRING', description: 'ID del paciente' },
            date: { type: 'STRING', description: 'Fecha de la sesion YYYY-MM-DD' },
            reason: { type: 'STRING', description: 'Motivo de consulta' },
            symptoms: { type: 'STRING', description: 'Sintomas reportados' },
            areas: { type: 'STRING', description: 'Zonas trabajadas' },
            treatment: { type: 'STRING', description: 'Tratamiento aplicado' },
            observations: { type: 'STRING', description: 'Observaciones' },
            nextSession: { type: 'STRING', description: 'Indicaciones proxima sesion' },
          },
          required: ['clientId', 'date', 'reason'],
        },
      },
      {
        name: 'register_patient',
        description: 'Registra un nuevo paciente',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING', description: 'Nombre completo' },
            phone: { type: 'STRING', description: 'Telefono' },
          },
          required: ['name', 'phone'],
        },
      },
      {
        name: 'get_today_appointments',
        description: 'Obtiene los turnos de hoy o de una fecha especifica',
        parameters: {
          type: 'OBJECT',
          properties: {
            date: { type: 'STRING', description: 'Fecha YYYY-MM-DD (por defecto hoy)' },
          },
          required: [],
        },
      },
      {
        name: 'play_music',
        description: 'Controla la musica ambiente. Puede reproducir, pausar o buscar una track especifica.',
        parameters: {
          type: 'OBJECT',
          properties: {
            action: { type: 'STRING', description: 'Accion: play, pause, next' },
            query: { type: 'STRING', description: 'Nombre de la cancion o genero a buscar (opcional)' },
          },
          required: ['action'],
        },
      },
      {
        name: 'cancel_appointment',
        description: 'Cancela una cita existente.',
        parameters: {
          type: 'OBJECT',
          properties: {
            appointmentId: { type: 'STRING', description: 'ID de la cita (si se conoce)' },
            clientName: { type: 'STRING', description: 'Nombre del cliente (para buscar la cita)' },
            date: { type: 'STRING', description: 'Fecha de la cita YYYY-MM-DD (para buscar)' },
          },
          required: [],
        },
      },
      {
        name: 'reschedule_appointment',
        description: 'Reprograma un turno existente a una nueva fecha y hora.',
        parameters: {
          type: 'OBJECT',
          properties: {
            appointmentId: { type: 'STRING', description: 'ID del turno a reprogramar' },
            newDate: { type: 'STRING', description: 'Nueva fecha YYYY-MM-DD' },
            newTime: { type: 'STRING', description: 'Nuevas hora HH:MM' },
          },
          required: ['appointmentId', 'newDate', 'newTime'],
        },
      },
    ],
  },
];

async function executeFunction(name: string, args: Record<string, string>, actions: any[]) {
  if (name === 'search_patients') {
    const q = args.query.toLowerCase();
    const clients = await prisma.client.findMany({
      where: {
        business: 'mg_masajes',
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ]
      },
      take: 10,
    });
    return { patients: clients.map(c => ({ id: c.id, name: c.name, phone: c.phone })) };
  }

  if (name === 'get_patient_history') {
    const client = await prisma.client.findUnique({ where: { id: args.clientId } });
    if (!client) return { error: 'Paciente no encontrado' };
    const records = await prisma.patientRecord.findMany({
      where: { clientId: args.clientId },
      orderBy: { date: 'desc' },
    });
    const appointments = await prisma.appointment.findMany({
      where: { clientPhone: client.phone },
      orderBy: { date: 'desc' },
      take: 10,
    });
    return {
      patient: { name: client.name, phone: client.phone },
      records: records.map(r => ({ date: r.date, reason: r.reason, symptoms: r.symptoms, areas: r.areas, treatment: r.treatment, observations: r.observations, nextSession: r.nextSession })),
      appointments: appointments.map(a => ({ date: a.date, time: a.time, service: a.service, status: a.status })),
    };
  }

  if (name === 'save_patient_record') {
    const record = await prisma.patientRecord.create({
      data: {
        clientId: args.clientId,
        date: args.date,
        reason: args.reason,
        symptoms: args.symptoms || null,
        areas: args.areas || null,
        treatment: args.treatment || null,
        observations: args.observations || null,
        nextSession: args.nextSession || null,
      }
    });
    return { success: true, recordId: record.id };
  }

  if (name === 'register_patient') {
    const client = await prisma.client.upsert({
      where: { phone_business: { phone: args.phone, business: 'mg_masajes' } },
      update: { name: args.name },
      create: { name: args.name, phone: args.phone, business: 'mg_masajes' },
    });
    return { success: true, clientId: client.id, name: client.name };
  }

  if (name === 'play_music') {
    const cmd = { type: 'music_command', action: args.action || 'play', query: args.query || null };
    actions.push(cmd);
    return cmd;
  }

  if (name === 'cancel_appointment') {
    let appointment;
    if (args.appointmentId) {
      appointment = await prisma.appointment.findUnique({ where: { id: args.appointmentId } });
    } else if (args.clientName && args.date) {
      const matches = await prisma.appointment.findMany({
        where: {
          clientName: { contains: args.clientName, mode: 'insensitive' },
          date: args.date,
          status: { not: 'cancelado' },
        },
      });
      if (matches.length > 1) {
        return { error: 'Hay varias citas ese dia para ese cliente', citas: matches.map(a => ({ id: a.id, time: a.time, service: a.service })) };
      }
      appointment = matches[0];
    }
    if (!appointment) return { error: 'Cita no encontrada' };
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'cancelado' },
    });
    return { success: true, cancelled: { id: appointment.id, clientName: appointment.clientName, date: appointment.date, time: appointment.time } };
  }

  if (name === 'get_today_appointments') {
    const date = args.date || new Date().toISOString().split('T')[0];
    const appointments = await prisma.appointment.findMany({
      where: { date, status: { not: 'cancelado' } },
      orderBy: { time: 'asc' },
    });
    return { date, appointments: appointments.map(a => ({ time: a.time, clientName: a.clientName, clientPhone: a.clientPhone, service: a.service, status: a.status })) };
  }

  if (name === 'reschedule_appointment') {
    try {
      const { appointmentId, newDate, newTime } = args;
      const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (!appointment) return { error: 'No encontre el turno original' };

      // Check availability (ignoring the current appointment)
      const existing = await prisma.appointment.findFirst({
        where: {
          date: newDate,
          time: newTime,
          status: { not: 'cancelado' },
          id: { not: appointmentId },
        }
      });

      if (existing) {
        return { error: `El horario ${newTime} del ${newDate} ya esta ocupado por ${existing.clientName}.` };
      }

      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { date: newDate, time: newTime }
      });

      return { success: true, rescheduled: { id: appointmentId, newDate, newTime } };
    } catch (error) {
      console.error('Agent Reschedule error:', error);
      return { error: 'Error tecnico al reprogramar' };
    }
  }

  return { error: 'Funcion no encontrada' };
}

router.post('/', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

    const actions: any[] = [];
    
    const result = await chatWithFallback({
      systemPrompt: SYSTEM_PROMPT,
      message,
      history: history || [],
      tools,
      onFunctionCall: (name, args) => executeFunction(name, args, actions),
    });

    res.json({ reply: result.reply, actions });
  } catch (error) {
    console.error('Agent Damian error:', error);
    res.json({ reply: 'Hubo un error, intenta de nuevo.' });
  }
});

export { router as agentMgMasajesRoutes };
