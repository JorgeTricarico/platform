import { Router } from 'express';
import { prisma } from '../db.js';
import { chatWithFallback } from '../services/ai-chat.js';
import { normalizeArgentinePhone } from '../utils/phone.js';

import { ZENCO_CONFIG } from '../config/zenco.js';

const router = Router();

const PRICE_LIST = ZENCO_CONFIG.priceList;

const SYSTEM_PROMPT = ZENCO_CONFIG.publicChat.systemPrompt;

// No function calling needed — all data is pre-fetched and injected as context

/** Pre-fetch all relevant context before calling Gemini */
async function buildContext(senderPhone?: string, message?: string): Promise<string> {
  const parts: string[] = [];
  // Normalizar el teléfono entrante: el sistema interno trabaja en E.164
  const normalizedSender = senderPhone
    ? (normalizeArgentinePhone(senderPhone).e164 ?? senderPhone)
    : undefined;

  try {
    // 1. If we have a phone, look up the client + their orders
    if (normalizedSender) {
      const client = await prisma.client.findUnique({
        where: { phone_business: { phone: normalizedSender, business: 'zenco' } }
      });
      if (client) {
        parts.push(`CLIENTE IDENTIFICADO: ${client.name} (tel: ${client.phone})`);
        parts.push('Podes saludarlo por nombre.');

        const orders = await prisma.order.findMany({
          where: { clientPhone: normalizedSender },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { items: true },
        });
        if (orders.length > 0) {
          parts.push(`SUS PEDIDOS (${orders.length}):`);
          for (const o of orders) {
            const itemsDesc = o.items.map(i => `"${i.garmentName}" (${i.repairType}) $${i.price}`).join(', ');
            parts.push(`  - ${itemsDesc} → Estado: ${o.status} | Entrega: ${o.deliveryDate || 'sin fecha'}`);
          }
        } else {
          parts.push('Este cliente no tiene pedidos registrados.');
        }
      }
    }

    // 2. Try to find the client by name mentioned in the message
    if (parts.length === 0 && message) {
      // Extract potential name (after "soy")
      const nameMatch = message.match(/(?:soy|me llamo|mi nombre es)\s+([a-záéíóúñ\s]+)/i);
      if (nameMatch) {
        const name = nameMatch[1].trim();
        const clients = await prisma.client.findMany({
          where: { name: { contains: name, mode: 'insensitive' }, business: 'zenco' },
          take: 3,
        });
        if (clients.length > 0) {
          const clientPhones = clients.map(c => c.phone);
          const allOrders = await prisma.order.findMany({
            where: { clientPhone: { in: clientPhones } },
            orderBy: { createdAt: 'desc' },
            include: { items: true },
          });

          for (const client of clients) {
            parts.push(`CLIENTE ENCONTRADO POR NOMBRE: ${client.name} (tel: ${client.phone})`);
            const orders = allOrders
              .filter(o => o.clientPhone === client.phone)
              .slice(0, 5);

            if (orders.length > 0) {
              parts.push(`  Pedidos:`);
              for (const o of orders) {
                const itemsDesc = o.items.map(i => `"${i.garmentName}" (${i.repairType}) $${i.price}`).join(', ');
                parts.push(`  - ${itemsDesc} → Estado: ${o.status} | Entrega: ${o.deliveryDate || 'sin fecha'}`);
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
        include: { items: true },
      });
      if (recentOrders.length > 0) {
        parts.push('CLIENTE NO IDENTIFICADO. Pedidos recientes del taller:');
        for (const o of recentOrders) {
          const itemDesc = (o.items as Array<{ garmentName: string; repairType: string; price: number }> ?? []).map(i => `"${i.garmentName}" (${i.repairType}) $${i.price}`).join(', ');
          parts.push(`  - ${o.clientName} (${o.clientPhone}): ${itemDesc} → ${o.status}`);
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
      const normalizedSender = normalizeArgentinePhone(senderPhone).e164 ?? senderPhone;
      try {
        await prisma.client.upsert({
          where: { phone_business: { phone: normalizedSender, business: 'zenco' } },
          update: {},
          create: { name: 'Cliente nuevo', phone: normalizedSender, business: 'zenco' },
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
