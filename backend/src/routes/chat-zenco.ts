import { Router } from 'express';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { prisma } from '../db.js';

const router = Router();

const SYSTEM_PROMPT = `Eres Ana, dueña de Zenco (taller de arreglos de ropa e indumentaria en Argentina).
Eres amable, profesional y servicial.
Tu funcion es atender consultas de clientes sobre:
- Estado de sus arreglos/pedidos (si preguntan, usa la informacion de la base de datos)
- Tipos de arreglos que haces: dobladillo, cambio de cierre, entalle/achicar, diseño nuevo
- Presupuestos aproximados
- Tiempos de entrega

REGLAS ESTRICTAS:
- NUNCA inventes datos de pedidos. Usa lookup_order para buscar en la base de datos.
- Si el cliente pregunta por su pedido, pedile nombre o telefono y usa lookup_order.
- Si preguntan precios, usa check_prices para dar info actualizada.
- Responde en español argentino casual pero profesional.
- Respuestas cortas (maximo 3 oraciones).
- Si preguntan algo que no es sobre ropa/arreglos, redirigí amablemente.`;

const tools: any[] = [
  {
    functionDeclarations: [
      {
        name: 'lookup_order',
        description: 'Busca pedidos/arreglos de un cliente por nombre o telefono. Usar cuando el cliente pregunta por el estado de su prenda.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            clientName: { type: SchemaType.STRING, description: 'Nombre del cliente (parcial o completo)' },
            clientPhone: { type: SchemaType.STRING, description: 'Telefono del cliente' },
          },
        },
      },
      {
        name: 'check_prices',
        description: 'Consulta los precios y tiempos estimados de los servicios de arreglos de ropa.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            service: { type: SchemaType.STRING, description: 'Tipo de arreglo que busca (dobladillo, cierre, entalle, etc). Dejar vacio para ver todos.' },
          },
        },
      },
    ],
  },
];

const PRICE_LIST = [
  { service: 'Dobladillo de pantalon', price: '$3.000 - $5.000', time: '2-3 dias' },
  { service: 'Cambio de cierre', price: '$4.000 - $7.000', time: '3-5 dias' },
  { service: 'Entalle / Achicar', price: '$5.000 - $10.000', time: '4-7 dias' },
  { service: 'Arreglo de ruedo', price: '$2.500 - $4.000', time: '2-3 dias' },
  { service: 'Parche / Remiendo', price: '$3.000 - $6.000', time: '2-4 dias' },
  { service: 'Diseño nuevo / A medida', price: 'Desde $15.000', time: 'A coordinar' },
];

async function executeFunction(name: string, args: Record<string, string>) {
  if (name === 'lookup_order') {
    const conditions: any[] = [];
    if (args.clientName) {
      conditions.push({ clientName: { contains: args.clientName, mode: 'insensitive' } });
    }
    if (args.clientPhone) {
      conditions.push({ clientPhone: args.clientPhone });
    }

    if (conditions.length === 0) {
      return { found: false, message: 'Necesito el nombre o telefono del cliente para buscar' };
    }

    const orders = await prisma.order.findMany({
      where: { OR: conditions },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (orders.length === 0) {
      return { found: false, message: 'No encontre pedidos con esos datos' };
    }

    return {
      found: true,
      total: orders.length,
      orders: orders.map(o => ({
        clientName: o.clientName,
        garment: o.garmentName,
        repair: o.repairType,
        status: o.status,
        deliveryDate: o.deliveryDate,
        price: o.price,
      })),
    };
  }

  if (name === 'check_prices') {
    if (args.service) {
      const lower = args.service.toLowerCase();
      const matched = PRICE_LIST.filter(p => p.service.toLowerCase().includes(lower));
      if (matched.length > 0) return { prices: matched };
    }
    return { prices: PRICE_LIST };
  }

  return { error: 'Funcion no encontrada' };
}

router.post('/', async (req, res) => {
  try {
    const { message, history, senderPhone, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.json({ reply: 'El bot no esta configurado todavia. Contactanos directamente!' });

    // Pre-lookup client by phone for context hint
    let clientHint = '';
    try {
      if (senderPhone) {
        const client = await prisma.client.findUnique({
          where: { phone_business: { phone: senderPhone, business: 'zenco' } }
        });
        if (client) {
          clientHint = `\n\n[INFO INTERNA - el cliente que escribe es: ${client.name} (tel: ${client.phone})${client.notes ? `, notas: ${client.notes}` : ''}. Podés saludarlo por nombre y usar lookup_order con su nombre para buscar sus pedidos.]`;
        }
      }
    } catch { /* DB not available */ }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT + clientHint,
      tools,
    });

    const chat = model.startChat({ history: history || [] });
    let response = await chat.sendMessage(message);
    let result = response.response;

    // Handle function calls (up to 3 rounds)
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

    // Auto-register client if phone provided and not found
    if (senderPhone && !clientHint) {
      try {
        await prisma.client.upsert({
          where: { phone_business: { phone: senderPhone, business: 'zenco' } },
          update: {},
          create: { name: 'Cliente nuevo', phone: senderPhone, business: 'zenco', notes: 'Registrado automaticamente via chat' },
        });
      } catch { /* ignore registration errors */ }
    }

    // Persist messages if sessionId provided
    if (sessionId) {
      try {
        await prisma.chatMessage.createMany({
          data: [
            { business: 'zenco', role: 'user', content: message, sessionId },
            { business: 'zenco', role: 'assistant', content: reply, sessionId },
          ],
        });
      } catch { /* persistence failure should not break chat */ }
    }

    res.json({ reply });
  } catch (error) {
    console.error('Chat Zenco error:', error);
    res.json({ reply: 'Perdon, estoy un poco ocupada en el taller. Escribime en un ratito!' });
  }
});

export { router as chatZencoRoutes };
