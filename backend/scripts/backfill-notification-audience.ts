/**
 * Backfill idempotente para Notification.audience.
 *
 * Contexto:
 *   Hasta la fecha, todas las notificaciones del modelo `Notification` eran
 *   avisos generados automaticamente cuando una orden pasaba a `listo` y
 *   estaban destinadas al cliente final. La campana del backoffice las
 *   mostraba a Ana indebidamente.
 *
 *   Se agrego el campo `audience` con default 'client'. Los registros
 *   nuevos quedan bien por el default. Pero para registros pre-migracion
 *   el campo estaria nulo en la columna fisica si Prisma no aplicara el
 *   default en backfill — depende de como Postgres maneje el ALTER TABLE.
 *
 *   Este script garantiza idempotencia: cualquier registro sin audience
 *   o con audience='' queda en 'client'.
 *
 * Modo por defecto: DRY RUN. Pasa --apply para escribir.
 *
 * Uso:
 *   npx tsx backend/scripts/backfill-notification-audience.ts             # dry-run
 *   npx tsx backend/scripts/backfill-notification-audience.ts --apply     # aplica
 */

import pg from 'pg';
import { config } from 'dotenv';

config();

async function main() {
  const apply = process.argv.includes('--apply');
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[backfill-audience] DATABASE_URL no esta seteado.');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: url });
  const client = await pool.connect();

  try {
    const countSql = `
      SELECT COUNT(*)::int AS missing
      FROM notifications
      WHERE audience IS NULL OR audience = ''
    `;
    const { rows } = await client.query(countSql);
    const missing = rows[0]?.missing ?? 0;
    console.log(`[backfill-audience] Filas sin audience: ${missing}`);

    if (missing === 0) {
      console.log('[backfill-audience] Nada para hacer. Idempotencia OK.');
      return;
    }

    if (!apply) {
      console.log('[backfill-audience] DRY RUN. Pasa --apply para escribir.');
      return;
    }

    const updateSql = `
      UPDATE notifications
      SET audience = 'client'
      WHERE audience IS NULL OR audience = ''
    `;
    const result = await client.query(updateSql);
    console.log(`[backfill-audience] Actualizadas ${result.rowCount} filas → audience='client'`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('[backfill-audience] Error:', e);
  process.exit(1);
});
