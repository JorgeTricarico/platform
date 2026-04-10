import { Router } from 'express';
import { SchemaType } from '@google/generative-ai';
import { prisma } from '../db.js';
import { chatWithFallback } from '../services/ai-chat.js';
import { DAMIAN_CONFIG } from '../config/damian.js';

const router = Router();

const SERVICE_PRICES = DAMIAN_CONFIG.services;

const SYSTEM_PROMPT = DAMIAN_CONFIG.publicChat.systemPrompt;

// Function calling SOLO para acciones que modifican la DB
const tools: any[] = [
  {
    functionDeclarations: [
      {
        name: 'book_appointment',
        description: 'Agenda un turno de masaje. Usar cuando el cliente confirma turno con fecha, hora y servicio.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            clientName: { type: SchemaType.STRING, description: 'Nombre del cliente' },
            clientPhone: { type: SchemaType.STRING, description: 'Telefono del cliente' },
            service: { type: SchemaType.STRING, description: 'Tipo de masaje' },
            date: { type: SchemaType.STRING, description: 'Fecha YYYY-MM-DD' },
            time: { type: SchemaType.STRING, description: 'Hora HH:MM' },
          },
          required: ['clientName', 'clientPhone', 'service', 'date', 'time'],
        },
      },
      {
        name: 'cancel_appointment',
        description: 'Cancela un turno existente por su ID. El ID viene del contexto pre-cargado.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            appointmentId: { type: SchemaType.STRING, description: 'ID del turno a cancelar' },
          },
          required: ['appointmentId'],
        },
      },
      {
        name: 'reschedule_appointment',
        description: 'Reprograma un turno existente a una nueva fecha y hora. Verifica disponibilidad automaticamente.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            appointmentId: { type: SchemaType.STRING, description: 'ID del turno a reprogramar' },
            newDate: { type: SchemaType.STRING, description: 'Nueva fecha YYYY-MM-DD' },
            newTime: { type: SchemaType.STRING, description: 'Nuevas hora HH:MM' },
          },
          required: ['appointmentId', 'newDate', 'newTime'],
        },
      },
    ],
  },
];

function matchService(input: string): string {
  const lower = input.toLowerCase();
  const hasPiernas = lower.includes('pierna');
  const hasCuerpo = lower.includes('cuerpo') || lower.includes('completo') || lower.includes('entero');
  const hasDrenaje = lower.includes('drenaje') || lower.includes('linfat');
  const hasDeportivo = lower.includes('deportivo') || lower.includes('deport');
  
  if (hasDrenaje) return 'Drenaje por Zona';
  if (hasDeportivo) return 'Masaje Deportivo';
  if (hasCuerpo) return 'Descontracturante Cuerpo Entero';
  if (hasPiernas) return 'Descontracturante Piernas';
  
  // Default to Cuello y Espalda for general or descontracturante requests
  return 'Descontracturante Cuello y Espalda';
}

async function executeFunction(name: string, args: Record<string, string>) {
  if (name === 'book_appointment') {
    const service = matchService(args.service);
    // Default to the base service price from config
    const defaultService = 'Descontracturante Cuello y Espalda';
    const info = SERVICE_PRICES[service] || SERVICE_PRICES[defaultService];
    // Ensure client is registered
    const phone = args.clientPhone || '(pendiente)';
    await prisma.client.upsert({
      where: { phone_business: { phone: phone, business: 'damian' } },
      update: { name: args.clientName },
      create: {
        name: args.clientName,
        phone: phone,
        business: 'damian',
      }
    });

    const appointment = await prisma.appointment.create({
      data: {
        id: `APT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        clientName: args.clientName,
        clientPhone: phone,
        service,
        duration: info.duration,
        date: args.date,
        time: args.time,
        status: 'pendiente',
        price: info.price,
        notes: 'Agendado via chat bot',
      },
    });
    return { success: true, appointment: { id: appointment.id, service, date: appointment.date, time: appointment.time, price: info.price } };
  }

  if (name === 'cancel_appointment') {
    try {
      const appointment = await prisma.appointment.findUnique({ where: { id: args.appointmentId } });
      if (!appointment) return { success: false, message: 'No encontre ese turno' };
      if (appointment.status === 'cancelado') return { success: false, message: 'Ese turno ya estaba cancelado' };

      await prisma.appointment.update({
        where: { id: args.appointmentId },
        data: { status: 'cancelado' },
      });
      return { success: true, cancelled: { id: appointment.id, service: appointment.service, date: appointment.date, time: appointment.time, clientName: appointment.clientName } };
    } catch {
      return { success: false, message: 'Error al cancelar el turno' };
    }
  }

  if (name === 'reschedule_appointment') {
    try {
      const { appointmentId, newDate, newTime } = args;
      const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (!appointment) return { success: false, message: 'No encontre el turno original' };

      // Check for availability in the new slot
      const existing = await prisma.appointment.findFirst({
        where: {
          date: newDate,
          time: newTime,
          status: { not: 'cancelado' },
          id: { not: appointmentId }, // Don't conflict with itself
        }
      });

      if (existing) {
        return { success: false, message: `Ese horario (${newTime}) ya esta ocupado para el dia ${newDate}.` };
      }

      const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { date: newDate, time: newTime }
      });

      return { success: true, rescheduled: { id: updated.id, oldDate: appointment.date, oldTime: appointment.time, newDate: updated.date, newTime: updated.time, service: updated.service } };
    } catch (error) {
      console.error('Reschedule error:', error);
      return { success: false, message: 'Error tecnico al reprogramar' };
    }
  }

  return { error: 'Funcion no encontrada' };
}

/** Pre-fetch ALL relevant context before calling Gemini */
async function buildContext(senderPhone?: string, message?: string): Promise<string> {
  const parts: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  try {
    // 1. Client identification by phone
    if (senderPhone) {
      const client = await prisma.client.findUnique({
        where: { phone_business: { phone: senderPhone, business: 'damian' } }
      });
      if (client) {
        parts.push(`CLIENTE IDENTIFICADO: ${client.name} (tel: ${client.phone})`);
        parts.push('Podes saludarlo por nombre.');

        // Their appointments
        const clientAppts = await prisma.appointment.findMany({
          where: { clientPhone: senderPhone },
          orderBy: { date: 'desc' },
          take: 10,
        });
        if (clientAppts.length > 0) {
          parts.push(`SUS TURNOS (${clientAppts.length}):`);
          for (const a of clientAppts) {
            parts.push(`  - [ID: ${a.id}] ${a.service} | ${a.date} ${a.time} | Estado: ${a.status} | $${a.price}`);
          }
        } else {
          parts.push('Este cliente no tiene turnos registrados.');
        }
      }
    }

    // 2. Try to find client by name in the message
    if (parts.length === 0 && message) {
      const nameMatch = message.match(/(?:soy|me llamo|mi nombre es)\s+([a-záéíóúñ\s]+)/i);
      if (nameMatch) {
        const name = nameMatch[1].trim();
        const clients = await prisma.client.findMany({
          where: { name: { contains: name, mode: 'insensitive' }, business: 'damian' },
          take: 3,
        });
        if (clients.length > 0) {
          for (const client of clients) {
            parts.push(`CLIENTE ENCONTRADO POR NOMBRE: ${client.name} (tel: ${client.phone})`);
            const appts = await prisma.appointment.findMany({
              where: { clientPhone: client.phone },
              orderBy: { date: 'desc' },
              take: 5,
            });
            if (appts.length > 0) {
              parts.push('  Turnos:');
              for (const a of appts) {
                parts.push(`  - [ID: ${a.id}] ${a.service} | ${a.date} ${a.time} | Estado: ${a.status}`);
              }
            }
          }
        }
      }
    }

    // 3. Schedule for next 7 days with free slots
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const weekdaySlots = DAMIAN_CONFIG.schedule.weekdaySlots;
    const saturdaySlots = DAMIAN_CONFIG.schedule.saturdaySlots;

    parts.push('\nAGENDA PROXIMOS 7 DIAS:');
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayOfWeek = d.getDay(); // 0=domingo
      const dayName = dayNames[dayOfWeek];

      // Skip sundays
      if (dayOfWeek === 0) {
        parts.push(`  ${dayName} ${dateStr}: CERRADO`);
        continue;
      }

      const allSlots = dayOfWeek === 6 ? saturdaySlots : weekdaySlots;
      const dayAppts = await prisma.appointment.findMany({
        where: { date: dateStr, status: { not: 'cancelado' } },
        orderBy: { time: 'asc' },
      });

      const occupied = dayAppts.map(a => a.time);
      const free = allSlots.filter(s => !occupied.includes(s));

      const label = i === 0 ? 'HOY' : i === 1 ? 'MAÑANA' : dayName;
      if (free.length === allSlots.length) {
        parts.push(`  ${label} ${dateStr}: todo libre (${free.join(', ')})`);
      } else if (free.length === 0) {
        parts.push(`  ${label} ${dateStr}: COMPLETO`);
      } else {
        parts.push(`  ${label} ${dateStr}: libres ${free.join(', ')}`);
        if (dayAppts.length > 0) {
          for (const a of dayAppts) {
            parts.push(`    ocupado ${a.time}`);
          }
        }
      }
    }


  } catch {
    parts.push('(No se pudo acceder a la base de datos)');
  }

  return '\n\n[CONTEXTO DEL SISTEMA]\n' + parts.join('\n');
}

router.post('/', async (req, res) => {
  try {
    const { message, history, senderPhone, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

    // Pre-fetch ALL context before calling AI
    const context = await buildContext(senderPhone, message);

    const { reply } = await chatWithFallback({
      systemPrompt: (senderPhone ? `SENDER_PHONE: ${senderPhone}\n\n` : '') + SYSTEM_PROMPT + context,
      message,
      history: history || [],
      tools,
      onFunctionCall: executeFunction,
    });

    // Auto-register client if phone provided and not found (or update if needed)
    if (senderPhone) {
      try {
        await prisma.client.upsert({
          where: { phone_business: { phone: senderPhone, business: 'damian' } },
          update: {},
          create: { name: 'Cliente nuevo', phone: senderPhone, business: 'damian' },
        });
      } catch { /* ignore */ }
    }


    // Persist messages
    if (sessionId) {
      try {
        await prisma.chatMessage.createMany({
          data: [
            { business: 'damian', role: 'user', content: message, sessionId },
            { business: 'damian', role: 'assistant', content: reply, sessionId },
          ],
        });
      } catch { /* ignore */ }
    }

    res.json({ reply });
  } catch (error) {
    console.error('Chat Damian error:', error);
    res.json({ reply: 'perdon, hubo un error. intenta de nuevo en un momento!' });
  }
});

export { router as chatDamianRoutes };
