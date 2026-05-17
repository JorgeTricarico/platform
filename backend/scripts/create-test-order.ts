/**
 * Crea una orden de prueba en prod para que Jorge pueda escanear con el
 * celular y probar el flujo completo del scanner. Nombre bien reconocible
 * ("🧪 TEST - PRUEBA SCANNER") + monto $1 para que sea evidente y no
 * contamine las metricas financieras.
 *
 * Workflow:
 *   1. npx tsx backend/scripts/create-test-order.ts
 *      → imprime el orderNumber + URL del QR para escanear
 *   2. Probas el flujo en la app: escanear, cambiar status, deshacer, etc.
 *   3. npx tsx backend/scripts/delete-test-order.ts
 *      → limpia el cliente TEST + sus ordenes (idempotente)
 *
 * Nota: si corres el create varias veces sin borrar, se acumulan ordenes
 * TEST (con orderNumbers consecutivos). Tambien se acumula 1 cliente por
 * unique constraint (phone, business). Para resetear: usa el delete-test-order.
 */

import { config } from 'dotenv';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

config();

const TEST_CLIENT_NAME = '🧪 TEST - PRUEBA SCANNER';
const TEST_CLIENT_PHONE = '5491100000000';
const TEST_ITEM_NAME = 'PRUEBA SCANNER';
const TEST_ITEM_PRICE = 1; // monto minimo, no contamina metricas
const TEST_REPAIR_TYPE = 'dobladillo';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('[create-test-order] DATABASE_URL no esta seteado en .env');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    // Upsert del cliente test (idempotente sobre el unique [phone, business])
    const client = await prisma.client.upsert({
      where: { phone_business: { phone: TEST_CLIENT_PHONE, business: 'zenco' } },
      update: { name: TEST_CLIENT_NAME },
      create: {
        name: TEST_CLIENT_NAME,
        phone: TEST_CLIENT_PHONE,
        business: 'zenco',
      },
    });

    // Crear la orden con status 'recibido' (es lo que arranca naturalmente).
    const orderId = `TEST-${randomUUID()}`;
    const today = new Date().toISOString().split('T')[0];
    const order = await prisma.order.create({
      data: {
        id: orderId,
        clientName: TEST_CLIENT_NAME,
        clientPhone: TEST_CLIENT_PHONE,
        status: 'recibido',
        intakeDate: today,
        deliveryDate: today,
        deposit: 0,
        items: {
          create: [{
            garmentName: TEST_ITEM_NAME,
            repairType: TEST_REPAIR_TYPE,
            description: 'Orden de prueba — borrable con delete-test-order',
            price: TEST_ITEM_PRICE,
          }],
        },
      },
      include: { items: true },
    });

    const orderRef = `ORD-${String(order.orderNumber).padStart(6, '0')}`;
    const qrData = String(order.orderNumber);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${qrData}&size=400x400`;

    console.log('═════════════════════════════════════════════════════════');
    console.log('✓ Orden de prueba creada');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`  Cliente:     ${client.name}`);
    console.log(`  OrderNumber: ${order.orderNumber}`);
    console.log(`  Referencia:  ${orderRef}`);
    console.log(`  Status:      ${order.status}`);
    console.log(`  Monto:       $${TEST_ITEM_PRICE}`);
    console.log('─────────────────────────────────────────────────────────');
    console.log('QR para escanear (abrir en celular o pantalla):');
    console.log(`  ${qrUrl}`);
    console.log('─────────────────────────────────────────────────────────');
    console.log('Para limpiar cuando termines:');
    console.log('  npx tsx backend/scripts/delete-test-order.ts');
    console.log('═════════════════════════════════════════════════════════');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('[create-test-order] Error:', e);
  process.exit(1);
});
