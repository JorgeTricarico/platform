/**
 * Limpia cliente TEST + sus ordenes (creadas por create-test-order.ts).
 * Idempotente: si no hay nada que borrar, no falla.
 *
 * Borra en orden:
 *   1. Notificaciones del cliente TEST.
 *   2. Ordenes del cliente TEST (cascada borra OrderItems).
 *   3. El cliente TEST.
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const TEST_CLIENT_PHONE = '5491100000000';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('[delete-test-order] DATABASE_URL no esta seteado en .env');
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const client = await prisma.client.findFirst({
      where: { phone: TEST_CLIENT_PHONE, business: 'zenco' },
    });
    if (!client) {
      console.log('[delete-test-order] No hay cliente TEST. Nada que limpiar.');
      return;
    }

    const notifs = await prisma.notification.deleteMany({
      where: { clientId: client.id },
    });

    const orders = await prisma.order.deleteMany({
      where: { clientPhone: TEST_CLIENT_PHONE },
    });

    await prisma.client.delete({ where: { id: client.id } });

    console.log('═════════════════════════════════════════════════════════');
    console.log('✓ Limpieza completada');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`  Notificaciones borradas: ${notifs.count}`);
    console.log(`  Ordenes borradas:        ${orders.count} (items en cascada)`);
    console.log(`  Cliente borrado:         ${client.name}`);
    console.log('═════════════════════════════════════════════════════════');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('[delete-test-order] Error:', e);
  process.exit(1);
});
