import { Router } from 'express';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { prisma } from '../db.js';

const router = Router();

const SYSTEM_PROMPT = `Sos el asistente personal de Damian, masajista profesional.
Este chat es PRIVADO — solo Damian lo usa, no es para clientes.
Tu rol es ayudarlo a gestionar su negocio:
- Buscar pacientes y sus fichas clinicas
- Guardar nuevas fichas clinicas despues de cada sesion
- Consultar turnos del dia
- Dar resumenes de historial de pacientes
- Cancelar citas cuando Damian lo pida
- Controlar la musica ambiente (poner, pausar, cambiar track)

Cuando Damian dice "pone musica" sin especificar, responde con play_music sin query para que el frontend reproduzca la ultima o la primera disponible. Si pide una en particular ("pone musica relajante"), usa play_music con el nombre como query para buscar en las tracks guardadas.

Habla en español argentino, casual pero eficiente. Respuestas concisas.
Cuando Damian te dice datos de una sesion, usa save_patient_record para guardarlos.
Si menciona un paciente, buscalo primero con search_patients.
Cuando te pidan la ficha o historial de un paciente, usa search_patients para encontrarlo y luego get_patient_history para obtener toda su info. Resumi las sesiones anteriores de forma clara: fechas, motivos, tratamientos y observaciones relevantes.

IMPORTANTE: Siempre confirma antes de guardar datos. Mostra un resumen de lo que vas a guardar.`;

const tools: any[] = [
  {
    functionDeclarations: [
      {
        name: 'search_patients',
        description: 'Busca pacientes por nombre o telefono',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: { type: SchemaType.STRING, description: 'Nombre o telefono del paciente' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_patient_history',
        description: 'Obtiene el historial clinico completo de un paciente por su ID',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            clientId: { type: SchemaType.STRING, description: 'ID del paciente' },
          },
          required: ['clientId'],
        },
      },
      {
        name: 'save_patient_record',
        description: 'Guarda una nueva ficha clinica para un paciente',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            clientId: { type: SchemaType.STRING, description: 'ID del paciente' },
            date: { type: SchemaType.STRING, description: 'Fecha de la sesion YYYY-MM-DD' },
            reason: { type: SchemaType.STRING, description: 'Motivo de consulta' },
            symptoms: { type: SchemaType.STRING, description: 'Sintomas reportados' },
            areas: { type: SchemaType.STRING, description: 'Zonas trabajadas' },
            treatment: { type: SchemaType.STRING, description: 'Tratamiento aplicado' },
            observations: { type: SchemaType.STRING, description: 'Observaciones' },
            nextSession: { type: SchemaType.STRING, description: 'Indicaciones proxima sesion' },
          },
          required: ['clientId', 'date', 'reason'],
        },
      },
      {
        name: 'register_patient',
        description: 'Registra un nuevo paciente',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, description: 'Nombre completo' },
            phone: { type: SchemaType.STRING, description: 'Telefono' },
            email: { type: SchemaType.STRING, description: 'Email' },
            notes: { type: SchemaType.STRING, description: 'Notas generales (alergias, condiciones, etc)' },
          },
          required: ['name', 'phone'],
        },
      },
      {
        name: 'get_today_appointments',
        description: 'Obtiene los turnos de hoy o de una fecha especifica',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            date: { type: SchemaType.STRING, description: 'Fecha YYYY-MM-DD (por defecto hoy)' },
          },
          required: [],
        },
      },
      {
        name: 'play_music',
        description: 'Controla la musica ambiente. Puede reproducir, pausar o buscar una track especifica entre las que tiene guardadas el usuario.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            action: { type: SchemaType.STRING, description: 'Accion: play, pause, next' },
            query: { type: SchemaType.STRING, description: 'Nombre de la cancion o genero a buscar (opcional)' },
          },
          required: ['action'],
        },
      },
      {
        name: 'cancel_appointment',
        description: 'Cancela una cita existente. Busca por nombre del cliente y fecha, o por ID de la cita.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            appointmentId: { type: SchemaType.STRING, description: 'ID de la cita (si se conoce)' },
            clientName: { type: SchemaType.STRING, description: 'Nombre del cliente (para buscar la cita)' },
            date: { type: SchemaType.STRING, description: 'Fecha de la cita YYYY-MM-DD (para buscar)' },
          },
          required: [],
        },
      },
    ],
  },
];

async function executeFunction(name: string, args: Record<string, string>) {
  if (name === 'search_patients') {
    const q = args.query.toLowerCase();
    const clients = await prisma.client.findMany({
      where: {
        business: 'damian',
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ]
      },
      take: 10,
    });
    return { patients: clients.map(c => ({ id: c.id, name: c.name, phone: c.phone, notes: c.notes })) };
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
      patient: { name: client.name, phone: client.phone, notes: client.notes },
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
      where: { phone_business: { phone: args.phone, business: 'damian' } },
      update: { name: args.name, email: args.email || null, notes: args.notes || null },
      create: { name: args.name, phone: args.phone, email: args.email || null, business: 'damian', notes: args.notes || null },
    });
    return { success: true, clientId: client.id, name: client.name };
  }

  if (name === 'play_music') {
    return { action: args.action || 'play', query: args.query || null, type: 'music_command' };
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

  return { error: 'Funcion no encontrada' };
}

router.post('/', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.json({ reply: 'API key no configurada' });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite-preview',
      systemInstruction: SYSTEM_PROMPT,
      tools,
    });

    const chat = model.startChat({ history: history || [] });
    let response = await chat.sendMessage(message);
    let result = response.response;

    const actions: Array<{ type: string; [key: string]: unknown }> = [];
    let maxRounds = 5;
    while (maxRounds-- > 0) {
      const functionCalls = result.functionCalls();
      if (!functionCalls || functionCalls.length === 0) break;

      const functionResponses = [];
      for (const fc of functionCalls) {
        const fnResult = await executeFunction(fc.name, fc.args as Record<string, string>);
        if (fnResult && typeof fnResult === 'object' && 'type' in fnResult && fnResult.type === 'music_command') {
          actions.push(fnResult as { type: string; action: string; query: string | null });
        }
        functionResponses.push({
          functionResponse: { name: fc.name, response: fnResult },
        });
      }

      response = await chat.sendMessage(functionResponses);
      result = response.response;
    }

    const reply = result.text();
    res.json({ reply, ...(actions.length > 0 && { actions }) });
  } catch (error) {
    console.error('Agent Damian error:', error);
    res.json({ reply: 'Hubo un error, intenta de nuevo.' });
  }
});

export { router as agentDamianRoutes };
