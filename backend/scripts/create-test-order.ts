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
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

const __dirname = dirname(fileURLToPath(import.meta.url));

// El script puede correrse desde la raiz del repo o desde backend/, asi que
// resolvemos el .env relativo al script en vez del cwd.
config({ path: join(__dirname, '..', '.env') });

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
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
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

    // Generamos el QR como PNG local para evitar la pagina envoltorio de
    // api.qrserver.com (que renderiza el QR sobre fondo oscuro y rompe
    // muchos escaners). Fondo blanco + modulos negros = lectura optima.
    const qrPath = join(__dirname, 'test-order-qr.png');
    await QRCode.toFile(qrPath, qrData, {
      width: 600,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    console.log('═════════════════════════════════════════════════════════');
    console.log('✓ Orden de prueba creada');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`  Cliente:     ${client.name}`);
    console.log(`  OrderNumber: ${order.orderNumber}`);
    console.log(`  Referencia:  ${orderRef}`);
    console.log(`  Status:      ${order.status}`);
    console.log(`  Monto:       $${TEST_ITEM_PRICE}`);
    console.log(`  QR data:     ${qrData}`);
    console.log('─────────────────────────────────────────────────────────');
    console.log('QR generado (abrir en visor de imagenes y escanear):');
    console.log(`  ${qrPath}`);
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
