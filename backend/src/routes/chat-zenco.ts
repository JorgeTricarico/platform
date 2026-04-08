import { Router } from 'express';
import { prisma } from '../db.js';
import { chatWithFallback } from '../services/ai-chat.js';

const router = Router();

const PRICE_LIST = [
  { service: 'Dobladillo de pantalon', price: '$3.000 - $5.000', time: '2-3 dias' },
  { service: 'Cambio de cierre', price: '$4.000 - $7.000', time: '3-5 dias' },
  { service: 'Entalle / Achicar', price: '$5.000 - $10.000', time: '4-7 dias' },
  { service: 'Arreglo de ruedo', price: '$2.500 - $4.000', time: '2-3 dias' },
  { service: 'Parche / Remiendo', price: '$3.000 - $6.000', time: '2-4 dias' },
  { service: 'Diseño nuevo / A medida', price: 'Desde $15.000', time: 'A coordinar' },
];

const SYSTEM_PROMPT = `Tu nombre es Ana, sos la dueña de Zenco, un taller de arreglos de ropa e indumentaria en Argentina.
Sos amable, profesional y servicial.
Cuando alguien te saluda, SIEMPRE menciona que sos de Zenco o pregunta en que lo podes ayudar con sus prendas.
Tu funcion es atender consultas de clientes sobre:
- Estado de sus arreglos/pedidos
- Tipos de arreglos que haces: dobladillo, cambio de cierre, entalle/achicar, diseño nuevo
- Presupuestos aproximados
- Tiempos de entrega

LISTA DE PRECIOS:
${PRICE_LIST.map(p => `- ${p.service}: ${p.price} (${p.time})`).join('\n')}

REGLAS ESTRICTAS:
- NUNCA inventes datos de pedidos. Usa SOLO la info que te llega en [CONTEXTO].
- Si el cliente pregunta por su pedido y no hay datos en el contexto, pedile nombre o telefono.
- Responde en español argentino casual pero profesional.
- Respuestas cortas (maximo 3 oraciones).
- Si preguntan algo que no es sobre ropa/arreglos, redirigí amablemente.`;

// No function calling needed — all data is pre-fetched and injected as context

/** Pre-fetch all relevant context before calling Gemini */
async function buildContext(senderPhone?: string, message?: string): Promise<string> {
  const parts: string[] = [];

  try {
    // 1. If we have a phone, look up the client + their orders
    if (senderPhone) {
      const client = await prisma.client.findUnique({
        where: { phone_business: { phone: senderPhone, business: 'zenco' } }
      });
      if (client) {
        parts.push(`CLIENTE IDENTIFICADO: ${client.name} (tel: ${client.phone})${client.notes ? ` — Notas: ${client.notes}` : ''}`);
        parts.push('Podes saludarlo por nombre.');

        const orders = await prisma.order.findMany({
          where: { clientPhone: senderPhone },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });
        if (orders.length > 0) {
          parts.push(`SUS PEDIDOS (${orders.length}):`);
          for (const o of orders) {
            parts.push(`  - "${o.garmentName}" (${o.repairType}) → Estado: ${o.status} | Entrega: ${o.deliveryDate || 'sin fecha'} | $${o.price}`);
          }
        } else {
          parts.push('Este cliente no tiene pedidos registrados.');
        }
      }
    }

    // 2. Try to find the client by name mentioned in the message
    if (parts.length === 0 && message) {
      // Extract potential name (first word that's capitalized or after "soy")
      const nameMatch = message.match(/(?:soy|me llamo|mi nombre es)\s+(\w+)/i);
      if (nameMatch) {
        const name = nameMatch[1];
        const clients = await prisma.client.findMany({
          where: { name: { contains: name, mode: 'insensitive' }, business: 'zenco' },
          take: 3,
        });
        if (clients.length > 0) {
          for (const client of clients) {
            parts.push(`CLIENTE ENCONTRADO POR NOMBRE: ${client.name} (tel: ${client.phone})`);
            const orders = await prisma.order.findMany({
              where: { clientPhone: client.phone },
              orderBy: { createdAt: 'desc' },
              take: 5,
            });
            if (orders.length > 0) {
              parts.push(`  Pedidos:`);
              for (const o of orders) {
                parts.push(`  - "${o.garmentName}" (${o.repairType}) → Estado: ${o.status} | Entrega: ${o.deliveryDate || 'sin fecha'} | $${o.price}`);
              }
            }
          }
        }
      }
    }

    // 3. If still no client context, show recent orders as general awareness
    if (parts.length === 0) {
      const recentOrders = await prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      if (recentOrders.length > 0) {
        parts.push('CLIENTE NO IDENTIFICADO. Pedidos recientes del taller:');
        for (const o of recentOrders) {
          parts.push(`  - ${o.clientName} (${o.clientPhone}): "${o.garmentName}" (${o.repairType}) → ${o.status} | $${o.price}`);
        }
        parts.push('Si el cliente dice su nombre o telefono, fijate si coincide con alguno de estos.');
      } else {
        parts.push('CLIENTE NO IDENTIFICADO. No hay pedidos cargados en el sistema.');
      }
    }

    // 4. Stats summary
    const totalPending = await prisma.order.count({ where: { status: { in: ['pendiente', 'en_proceso'] } } });
    const totalReady = await prisma.order.count({ where: { status: 'listo' } });
    parts.push(`\nREPORTE RAPIDO: ${totalPending} pedidos en proceso, ${totalReady} listos para retirar.`);

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
      systemPrompt: SYSTEM_PROMPT + context,
      message,
      history: history || [],
    });

    // Auto-register client if phone provided and not found
    if (senderPhone) {
      try {
        await prisma.client.upsert({
          where: { phone_business: { phone: senderPhone, business: 'zenco' } },
          update: {},
          create: { name: 'Cliente nuevo', phone: senderPhone, business: 'zenco', notes: 'Registrado automaticamente via chat' },
        });
      } catch { /* ignore */ }
    }

    // Persist messages
    if (sessionId) {
      try {
        await prisma.chatMessage.createMany({
          data: [
            { business: 'zenco', role: 'user', content: message, sessionId },
            { business: 'zenco', role: 'assistant', content: reply, sessionId },
          ],
        });
      } catch { /* ignore */ }
    }

    res.json({ reply });
  } catch (error) {
    console.error('Chat Zenco error:', error);
    res.json({ reply: 'Perdon, hubo un error. Intenta de nuevo en un momento!' });
  }
});

export { router as chatZencoRoutes };
