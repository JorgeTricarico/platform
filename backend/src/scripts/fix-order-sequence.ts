import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fixSequence() {
  console.log('--- Resecuenciación de Órdenes Zenco ---');
  
  try {
    // 1. Obtener todas las órdenes ordenadas por IntakeDate y luego por CreatedAt
    const orders = await prisma.order.findMany({
      orderBy: [
        { intakeDate: 'asc' },
        { createdAt: 'asc' }
      ],
      select: { id: true, orderNumber: true, clientName: true, intakeDate: true }
    });

    console.log(`Se encontraron ${orders.length} órdenes para procesar.`);

    // 2. Mover a números temporales para evitar violaciones de unicidad
    console.log('Moviendo a índices temporales...');
    for (const order of orders) {
      await prisma.order.update({
        where: { id: order.id },
        data: { orderNumber: order.orderNumber + 1000000 }
      });
    }

    // 3. Asignar números finales secuenciales
    console.log('Asignando números definitivos...');
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const newNumber = i + 1;
      await prisma.order.update({
        where: { id: order.id },
        data: { orderNumber: newNumber }
      });
      console.log(`[OK] ${order.clientName} (${order.intakeDate}): ${order.orderNumber} -> ${newNumber}`);
    }

    // 4. Resetear la secuencia de la base de datos para que las próximas empiecen en N+1
    const nextVal = orders.length + 1;
    // Usamos pg_get_serial_sequence para detectar el nombre real de la secuencia
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('orders', 'orderNumber'), ${nextVal}, false)`);
    
    console.log(`--- Proceso completado. Siguiente orden será: ${nextVal} ---`);
    console.log('NOTA: Los tickets impresos anteriormente ahora pueden tener números inválidos.');

  } catch (err) {
    console.error('Error durante la resecuenciación:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

fixSequence();
