/**
 * Script idempotente de normalización de teléfonos.
 *
 * Recorre todos los registros de `Client` y actualiza `phone` y `altPhone`
 * al formato E.164 sin `+` definido en `src/utils/phone.ts`.
 *
 * Reglas:
 *   - Si el phone ya está normalizado: no hace nada (idempotente).
 *   - Si el phone no se puede normalizar: lo reporta como fallido.
 *   - Si la normalización colisionaría con otro cliente (mismo phone+business
 *     ya existe en la DB): lo reporta como colisión y NO escribe.
 *
 * Uso:
 *   npx tsx backend/scripts/normalize-phones.ts
 *
 * Variables de entorno requeridas: DATABASE_URL (heredada del .env).
 */

import { PrismaClient } from '@prisma/client';
import { normalizeArgentinePhone } from '../src/utils/phone.js';

async function main() {
  const prisma = new PrismaClient();

  const phoneFailures: Array<{ id: string; name: string; phone: string; reason: string }> = [];
  const altPhoneFailures: Array<{ id: string; name: string; altPhone: string; reason: string }> = [];
  let phoneUpdated = 0;
  let phoneSkipped = 0;
  let altPhoneUpdated = 0;
  let altPhoneSkipped = 0;

  const clients = await prisma.client.findMany();
  console.log(`Total clientes a evaluar: ${clients.length}\n`);

  // --- Pass 1: normalizar phone (campo único en combinación con business) ---
  for (const c of clients) {
    const result = normalizeArgentinePhone(c.phone);
    if (!result.isValid || !result.e164) {
      phoneFailures.push({ id: c.id, name: c.name, phone: c.phone, reason: result.error ?? 'inválido' });
      continue;
    }
    if (result.e164 === c.phone) {
      phoneSkipped++;
      continue;
    }
    // Chequear colisión por (phone, business)
    const conflict = await prisma.client.findFirst({
      where: { phone: result.e164, business: c.business, NOT: { id: c.id } },
    });
    if (conflict) {
      phoneFailures.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        reason: `COLISIÓN: el phone "${result.e164}" ya existe en cliente ${conflict.id} (${conflict.name})`,
      });
      continue;
    }
    await prisma.client.update({
      where: { id: c.id },
      data: { phone: result.e164 },
    });
    phoneUpdated++;
  }

  // --- Pass 2: normalizar altPhone (campo opcional, no único) ---
  // Re-leer la tabla porque algunos phones cambiaron en el pase anterior
  const clientsRefreshed = await prisma.client.findMany();
  for (const c of clientsRefreshed) {
    if (!c.altPhone) continue;
    const result = normalizeArgentinePhone(c.altPhone);
    if (!result.isValid || !result.e164) {
      altPhoneFailures.push({ id: c.id, name: c.name, altPhone: c.altPhone, reason: result.error ?? 'inválido' });
      continue;
    }
    if (result.e164 === c.altPhone) {
      altPhoneSkipped++;
      continue;
    }
    await prisma.client.update({
      where: { id: c.id },
      data: { altPhone: result.e164 },
    });
    altPhoneUpdated++;
  }

  console.log('--- Resumen phone (principal, único por business) ---');
  console.log(`  Actualizados: ${phoneUpdated}`);
  console.log(`  Sin cambio (ya normalizados): ${phoneSkipped}`);
  console.log(`  Fallidos: ${phoneFailures.length}`);
  if (phoneFailures.length > 0) {
    console.log('  Detalles:');
    for (const f of phoneFailures) {
      console.log(`    - ${f.id} (${f.name}): "${f.phone}" → ${f.reason}`);
    }
  }

  console.log('\n--- Resumen altPhone (opcional, no único) ---');
  console.log(`  Actualizados: ${altPhoneUpdated}`);
  console.log(`  Sin cambio: ${altPhoneSkipped}`);
  console.log(`  Fallidos: ${altPhoneFailures.length}`);
  if (altPhoneFailures.length > 0) {
    console.log('  Detalles:');
    for (const f of altPhoneFailures) {
      console.log(`    - ${f.id} (${f.name}): "${f.altPhone}" → ${f.reason}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error en migración:', e);
  process.exit(1);
});
