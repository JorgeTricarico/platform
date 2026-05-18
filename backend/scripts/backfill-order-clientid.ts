/**
 * Z36: Backfill Order.clientId para ordenes historicas.
 *
 * Estrategia:
 *   1. Listar Order WHERE clientId IS NULL.
 *   2. Para cada uno, buscar Client por phone normalizado + business='zenco'.
 *   3. Si match, UPDATE clientId.
 *   4. Si no match, marcar como "huerfana" y reportar.
 *
 * Modo por defecto: DRY RUN. Pasá --apply para escribir.
 *
 * Uso:
 *   npx tsx backend/scripts/backfill-order-clientid.ts
 *   npx tsx backend/scripts/backfill-order-clientid.ts --apply
 *
 * Idempotente: re-ejecutar es seguro, solo afecta filas con clientId NULL.
 */

import pg from 'pg';
import { config } from 'dotenv';
import { normalizeArgentinePhone } from '../src/utils/phone.js';

config();

const APPLY = process.argv.includes('--apply');

async function main() {
  const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL en .env');
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

  const { rows: orders } = await client.query<{ id: string; clientPhone: string; clientName: string }>(
    `SELECT id, "clientPhone", "clientName" FROM orders WHERE "clientId" IS NULL`,
  );
  console.log(`Ordenes sin clientId: ${orders.length}`);

  const { rows: clients } = await client.query<{ id: string; phone: string }>(
    `SELECT id, phone FROM clients WHERE business = 'zenco'`,
  );
  const byPhone = new Map<string, string>();
  for (const c of clients) byPhone.set(c.phone, c.id);

  let matched = 0;
  let orphan = 0;
  const orphans: Array<{ id: string; clientPhone: string; clientName: string }> = [];

  for (const o of orders) {
    const normalized = normalizeArgentinePhone(o.clientPhone).e164 ?? o.clientPhone;
    const clientId = byPhone.get(normalized);
    if (clientId) {
      matched++;
      if (APPLY) {
        await client.query(`UPDATE orders SET "clientId" = $1 WHERE id = $2`, [clientId, o.id]);
      }
    } else {
      orphan++;
      orphans.push(o);
    }
  }

  console.log(`Matcheadas: ${matched}`);
  console.log(`Huerfanas: ${orphan}`);
  if (orphans.length > 0) {
    console.log('Sample huerfanas (primeras 10):');
    for (const o of orphans.slice(0, 10)) {
      console.log(`  ${o.id} ${o.clientPhone} ${o.clientName}`);
    }
  }

  await client.end();
  console.log(`Done. ${APPLY ? 'Cambios aplicados.' : 'Re-ejecutar con --apply para escribir.'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
