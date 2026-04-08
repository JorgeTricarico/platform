import { Router } from 'express';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { prisma } from '../db.js';

const router = Router();

const SERVICE_PRICES: Record<string, { price: number; duration: number }> = {
  'Masaje Descontracturante': { price: 8000, duration: 60 },
  'Masaje Relajante': { price: 7000, duration: 60 },
  'Masaje Deportivo': { price: 7500, duration: 45 },
  'Drenaje Linfatico': { price: 9000, duration: 60 },
};

const SYSTEM_PROMPT = `Sos Damian, masajista profesional. Tenes tu consultorio de masajes en Argentina.
Hablas como un pibe argentino comun, relajado y amable. Sin tanta formalidad.
NO uses mayusculas innecesarias, ni tildes perfectos, como si escribieras por whatsapp de verdad.
Respuestas cortas y naturales, como un mensaje de whatsapp real (1-3 oraciones max).

Tu servicio principal son masajes:
- Descontracturante (60 min, $8000)
- Relajante (60 min, $7000)
- Deportivo (45 min, $7500)
- Drenaje linfatico (60 min, $9000)

Horarios disponibles: lunes a viernes de 9 a 20hs, sabados de 10 a 15hs.
Turnos de 1 hora, ultimo turno a las 19hs (o 14hs sabados).

REGLAS:
- cuando te saludan, respondé natural y corto, tipo "hola que tal!" o "buenas! como andas?"
- si preguntan por masajes, contales brevemente que ofrecés y preguntá que les interesa
- si quieren un turno, usa la funcion book_appointment para agendarlo
- si quieren cancelar, busca en [CONTEXTO] el turno del cliente y usa cancel_appointment con su ID
- para ver disponibilidad, mira los turnos de hoy/proximos dias en [CONTEXTO]
- NUNCA inventes datos de citas. Usa SOLO la info del [CONTEXTO].
- si preguntan algo que no es de masajes, redirigí amablemente`;

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
          required: ['clientName', 'service', 'date', 'time'],
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
    ],
  },
];

function matchService(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('descontracturante') || lower.includes('descontract')) return 'Masaje Descontracturante';
  if (lower.includes('relajante') || lower.includes('relaj')) return 'Masaje Relajante';
  if (lower.includes('deportivo') || lower.includes('deport')) return 'Masaje Deportivo';
  if (lower.includes('drenaje') || lower.includes('linfat')) return 'Drenaje Linfatico';
  return input;
}

async function executeFunction(name: string, args: Record<string, string>) {
  if (name === 'book_appointment') {
    const service = matchService(args.service);
    const info = SERVICE_PRICES[service] || { price: 7000, duration: 60 };
    const appointment = await prisma.appointment.create({
      data: {
        id: `APT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        clientName: args.clientName,
        clientPhone: args.clientPhone || '',
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
        parts.push(`CLIENTE IDENTIFICADO: ${client.name} (tel: ${client.phone})${client.notes ? ` — Notas: ${client.notes}` : ''}`);
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
      const nameMatch = message.match(/(?:soy|me llamo|mi nombre es)\s+(\w+)/i);
      if (nameMatch) {
        const name = nameMatch[1];
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

    // 3. Today's schedule (always useful)
    const todayAppts = await prisma.appointment.findMany({
      where: { date: today, status: { not: 'cancelado' } },
      orderBy: { time: 'asc' },
    });
    parts.push(`\nAGENDA DE HOY (${today}):`);
    if (todayAppts.length > 0) {
      for (const a of todayAppts) {
        parts.push(`  - ${a.time} → ${a.clientName} — ${a.service} (${a.status})`);
      }
      const allSlots = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];
      const occupied = todayAppts.map(a => a.time);
      const free = allSlots.filter(s => !occupied.includes(s));
      if (free.length > 0) {
        parts.push(`  Horarios libres hoy: ${free.join(', ')}`);
      } else {
        parts.push('  Hoy esta completo.');
      }
    } else {
      parts.push('  Sin turnos agendados. Todos los horarios estan libres.');
    }

    // 4. Tomorrow's schedule
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const tomorrowAppts = await prisma.appointment.findMany({
      where: { date: tomorrowStr, status: { not: 'cancelado' } },
      orderBy: { time: 'asc' },
    });
    parts.push(`\nAGENDA DE MAÑANA (${tomorrowStr}):`);
    if (tomorrowAppts.length > 0) {
      for (const a of tomorrowAppts) {
        parts.push(`  - ${a.time} → ${a.clientName} — ${a.service}`);
      }
    } else {
      parts.push('  Sin turnos agendados.');
    }

    // 5. If no client identified, show recent clients for awareness
    if (!senderPhone && parts.filter(p => p.includes('CLIENTE')).length === 0) {
      parts.push('\nCLIENTE NO IDENTIFICADO. Si te dice su nombre o telefono, fijate si coincide con estos clientes recientes:');
      const recentClients = await prisma.client.findMany({
        where: { business: 'damian' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      for (const c of recentClients) {
        parts.push(`  - ${c.name} (${c.phone})`);
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.json({ reply: 'el bot no esta configurado todavia, escribime directo!' });

    // Pre-fetch ALL context before calling Gemini
    const context = await buildContext(senderPhone, message);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT + context,
      tools,
    });

    const chat = model.startChat({ history: history || [] });
    let response = await chat.sendMessage(message);
    let result = response.response;

    // Handle function calls (only for book/cancel actions)
    let maxRounds = 3;
    while (maxRounds-- > 0) {
      const functionCalls = result.functionCalls();
      if (!functionCalls || functionCalls.length === 0) break;

      const functionResponses = [];
      for (const fc of functionCalls) {
        const fnResult = await executeFunction(fc.name, fc.args as Record<string, string>);
        functionResponses.push({
          functionResponse: { name: fc.name, response: fnResult },
        });
      }

      response = await chat.sendMessage(functionResponses);
      result = response.response;
    }

    const reply = result.text();

    // Auto-register client if phone provided
    if (senderPhone) {
      try {
        await prisma.client.upsert({
          where: { phone_business: { phone: senderPhone, business: 'damian' } },
          update: {},
          create: { name: 'Cliente nuevo', phone: senderPhone, business: 'damian', notes: 'Registrado automaticamente via chat' },
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
