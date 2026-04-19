import { prisma } from './db.js';
import { whatsappService } from './services/whatsapp.js';

export async function checkOrders() {
  console.log(`[${new Date().toISOString()}] Checking orders for Zenco...`);

  try {
    // 1. Find orders that are 'listo'
    const readyOrders = await prisma.order.findMany({
      where: {
        status: 'listo',
      },
    });

    console.log(`Encontrados ${readyOrders.length} pedidos listos.`);

    for (const order of readyOrders) {
      try {
        await whatsappService.sendMessage(
          order.clientPhone,
          `Hola ${order.clientName}, tu prenda "${order.garmentName}" está lista para retirar!`
        );
      } catch (wsError) {
        console.error(`Error enviando WhatsApp para pedido ${order.id}:`, wsError);
      }
    }

    return readyOrders;
  } catch (error) {
    console.error('Error al verificar pedidos:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
const isMain = import.meta.url.endsWith(process.argv[1]) || (process.argv[1] && import.meta.url.includes(process.argv[1]));
if (isMain && process.env.NODE_ENV !== 'test') {
  checkOrders()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
}
