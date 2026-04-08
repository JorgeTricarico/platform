import { Router } from 'express';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { prisma } from '../db.js';

const router = Router();

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
- si quieren ver disponibilidad, usa check_appointments para ver que hay agendado ese dia
- si quieren cancelar un turno, pedile nombre y fecha, usa lookup_client para encontrar su turno, y despues cancel_appointment con el id del turno
- NUNCA inventes datos de citas. Si no sabes, preguntá.
- si preguntan algo que no es de masajes, redirigí amablemente`;

const tools: any[] = [
  {
    functionDeclarations: [
      {
        name: 'book_appointment',
        description: 'Agenda un turno de masaje para un cliente. Usar cuando el cliente confirma que quiere un turno.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            clientName: { type: SchemaType.STRING, description: 'Nombre del cliente' },
            clientPhone: { type: SchemaType.STRING, description: 'Telefono del cliente' },
            service: { type: SchemaType.STRING, description: 'Tipo de masaje' },
            date: { type: SchemaType.STRING, description: 'Fecha del turno en formato YYYY-MM-DD' },
            time: { type: SchemaType.STRING, description: 'Hora del turno en formato HH:MM' },
          },
          required: ['clientName', 'service', 'date', 'time'],
        },
      },
      {
        name: 'lookup_client',
        description: 'Busca un cliente por telefono en la base de datos. Usar cuando el cliente da su numero o queremos ver su historial.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            phone: { type: SchemaType.STRING, description: 'Telefono del cliente' },
          },
          required: ['phone'],
        },
      },
      {
        name: 'check_appointments',
        description: 'Consulta los turnos agendados para una fecha dada, para ver disponibilidad.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            date: { type: SchemaType.STRING, description: 'Fecha a consultar en formato YYYY-MM-DD' },
          },
          required: ['date'],
        },
      },
      {
        name: 'cancel_appointment',
        description: 'Cancela un turno existente por su ID. Usar despues de confirmar con el cliente cual turno quiere cancelar.',
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

const SERVICE_PRICES: Record<string, { price: number; duration: number }> = {
  'Masaje Descontracturante': { price: 8000, duration: 60 },
  'Masaje Relajante': { price: 7000, duration: 60 },
  'Masaje Deportivo': { price: 7500, duration: 45 },
  'Drenaje Linfatico': { price: 9000, duration: 60 },
};

function matchService(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('descontracturante') || lower.includes('descontract')) return 'Masaje Descontracturante';
  if (lower.includes('relajante') || lower.includes('relaj')) return 'Masaje Relajante';
  if (lower.includes('deportivo') || lower.includes('deport')) return 'Masaje Deportivo';
  if (lower.includes('drenaje') || lower.includes('linfat')) return 'Drenaje Linfatico';
  return input;
}

async function executeFunction(name: string, args: Record<string, string>) {
  if (name === 'lookup_client') {
    const phone = args.phone;
    const client = await prisma.client.findUnique({
      where: { phone_business: { phone, business: 'damian' } }
    });
    if (client) {
      const appointments = await prisma.appointment.findMany({
        where: { clientPhone: phone },
        orderBy: { date: 'desc' },
        take: 5,
      });
      return { found: true, name: client.name, phone: client.phone, notes: client.notes, appointments: appointments.map(a => ({ id: a.id, service: a.service, date: a.date, time: a.time, status: a.status })) };
    }
    return { found: false };
  }

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

  if (name === 'check_appointments') {
    const appointments = await prisma.appointment.findMany({
      where: { date: args.date, status: { not: 'cancelado' } },
      orderBy: { time: 'asc' },
    });
    const occupied = appointments.map(a => a.time);
    return { date: args.date, occupied_slots: occupied, total_booked: appointments.length };
  }

  if (name === 'cancel_appointment') {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: args.appointmentId },
      });
      if (!appointment) return { success: false, message: 'No encontre ese turno' };
      if (appointment.status === 'cancelado') return { success: false, message: 'Ese turno ya estaba cancelado' };

      await prisma.appointment.update({
        where: { id: args.appointmentId },
        data: { status: 'cancelado' },
      });
      return { success: true, cancelled: { id: appointment.id, service: appointment.service, date: appointment.date, time: appointment.time } };
    } catch {
      return { success: false, message: 'Error al cancelar el turno' };
    }
  }

  return { error: 'Funcion no encontrada' };
}

router.post('/', async (req, res) => {
  try {
    const { message, history, senderPhone, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.json({ reply: 'el bot no esta configurado todavia, escribime directo!' });

    // Pre-lookup client by phone
    let clientHint = '';
    try {
      if (senderPhone) {
        const client = await prisma.client.findUnique({
          where: { phone_business: { phone: senderPhone, business: 'damian' } }
        });
        if (client) {
          clientHint = `\n\n[INFO INTERNA - el cliente que escribe es: ${client.name} (tel: ${client.phone})${client.notes ? `, notas: ${client.notes}` : ''}. Podés saludarlo por nombre.]`;
        }
      }
    } catch { /* ignore */ }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT + clientHint,
      tools,
    });

    const chat = model.startChat({
      history: history || [],
    });

    let response = await chat.sendMessage(message);
    let result = response.response;

    // Handle function calls (may need multiple rounds)
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

    // Auto-register client if senderPhone and not found
    if (senderPhone && !clientHint) {
      try {
        await prisma.client.upsert({
          where: { phone_business: { phone: senderPhone, business: 'damian' } },
          update: {},
          create: { name: 'Cliente nuevo', phone: senderPhone, business: 'damian', notes: 'Registrado automaticamente via chat' },
        });
      } catch { /* ignore */ }
    }

    // Persist messages if sessionId provided
    if (sessionId) {
      try {
        await prisma.chatMessage.createMany({
          data: [
            { business: 'damian', role: 'user', content: message, sessionId },
            { business: 'damian', role: 'assistant', content: reply, sessionId },
          ],
        });
      } catch { /* persistence failure should not break chat */ }
    }

    res.json({ reply });
  } catch (error) {
    console.error('Chat Damian error:', error);
    res.json({ reply: 'perdon, estoy en una sesion ahora. te respondo en un rato!' });
  }
});

export { router as chatDamianRoutes };
