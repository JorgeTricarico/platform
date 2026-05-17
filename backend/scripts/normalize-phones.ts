/**
 * Script idempotente de normalización de teléfonos en todas las tablas.
 *
 * Cubre:
 *   - Client.phone (único por business)
 *   - Client.altPhone (opcional)
 *   - Order.clientPhone (desnormalizado)
 *   - Appointment.clientPhone (desnormalizado)
 *
 * Modo por defecto: DRY RUN. Pasá --apply para escribir.
 *
 * Uso:
 *   npx tsx backend/scripts/normalize-phones.ts              # dry-run
 *   npx tsx backend/scripts/normalize-phones.ts --apply      # aplica cambios
 *
 * Genera log JSON en backend/scripts/normalize-phones-<timestamp>.log.json
 * con todos los cambios (para reversibilidad).
 *
 * Usa pg directo (no Prisma) porque Prisma tiene timeouts cortos en
 * el pooler de Supabase para queries de bulk read.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';
import { config } from 'dotenv';
import { normalizeArgentinePhone } from '../src/utils/phone.js';

config();

type Change = {
  table: 'Client' | 'Order' | 'Appointment';
  id: string;
  field: 'phone' | 'altPhone' | 'clientPhone';
  oldValue: string;
  newValue: string;
  context?: string;
};

type Failure = {
  table: string;
  id: string;
  field: string;
  value: string;
  reason: string;
  context?: string;
};

async function main() {
  const apply = process.argv.includes('--apply');
  const mode = apply ? 'APPLY (escritura real)' : 'DRY RUN (sin escribir)';

  console.log(`\n=== Normalización de teléfonos: ${mode} ===\n`);

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 30000,
    query_timeout: 60000,
    statement_timeout: 60000,
  });

  const changes: Change[] = [];
  const failures: Failure[] = [];
  const skipped = { clientPhone: 0, clientAltPhone: 0, orderPhone: 0, appointmentPhone: 0 };

  try {
    // --- Pass 1: Client.phone ---
    const { rows: clients } = await pool.query<{ id: string; name: string; phone: string; altPhone: string | null; business: string }>(
      'SELECT id, name, phone, "altPhone", business FROM clients ORDER BY "createdAt" ASC'
    );
    console.log(`Clientes a evaluar: ${clients.length}`);

    // Mapa para detectar colisiones in-memory (sin re-querar la DB en cada iteración)
    const phoneByBusiness = new Map<string, Map<string, string>>(); // business -> (phoneNormalizado -> clientId)
    for (const c of clients) {
      if (!phoneByBusiness.has(c.business)) phoneByBusiness.set(c.business, new Map());
    }

    for (const c of clients) {
      const result = normalizeArgentinePhone(c.phone);
      if (!result.isValid || !result.e164) {
        failures.push({
          table: 'Client', id: c.id, field: 'phone', value: c.phone,
          reason: result.error ?? 'inválido', context: `name="${c.name}", business="${c.business}"`,
        });
        continue;
      }
      if (result.e164 === c.phone) {
        skipped.clientPhone++;
        phoneByBusiness.get(c.business)!.set(c.phone, c.id);
        continue;
      }
      // Check colisión por (phone normalizado, business) contra los YA registrados
      const existingId = phoneByBusiness.get(c.business)!.get(result.e164);
      if (existingId && existingId !== c.id) {
        failures.push({
          table: 'Client', id: c.id, field: 'phone', value: c.phone,
          reason: `COLISIÓN con cliente ${existingId} (mismo phone normalizado="${result.e164}")`,
          context: `name="${c.name}", business="${c.business}"`,
        });
        continue;
      }
      changes.push({
        table: 'Client', id: c.id, field: 'phone',
        oldValue: c.phone, newValue: result.e164,
        context: `name="${c.name}", business="${c.business}"`,
      });
      phoneByBusiness.get(c.business)!.set(result.e164, c.id);
      if (apply) {
        await pool.query('UPDATE clients SET phone=$1 WHERE id=$2', [result.e164, c.id]);
      }
    }

    // --- Pass 2: Client.altPhone ---
    for (const c of clients) {
      if (!c.altPhone) continue;
      const result = normalizeArgentinePhone(c.altPhone);
      if (!result.isValid || !result.e164) {
        failures.push({
          table: 'Client', id: c.id, field: 'altPhone', value: c.altPhone,
          reason: result.error ?? 'inválido', context: `name="${c.name}"`,
        });
        continue;
      }
      if (result.e164 === c.altPhone) {
        skipped.clientAltPhone++;
        continue;
      }
      changes.push({
        table: 'Client', id: c.id, field: 'altPhone',
        oldValue: c.altPhone, newValue: result.e164,
        context: `name="${c.name}"`,
      });
      if (apply) {
        await pool.query('UPDATE clients SET "altPhone"=$1 WHERE id=$2', [result.e164, c.id]);
      }
    }

    // --- Pass 3: Order.clientPhone ---
    const { rows: orders } = await pool.query<{ id: string; clientName: string; clientPhone: string }>(
      'SELECT id, "clientName", "clientPhone" FROM orders'
    );
    console.log(`Órdenes (Zenko) a evaluar: ${orders.length}`);

    for (const o of orders) {
      if (!o.clientPhone) continue;
      const result = normalizeArgentinePhone(o.clientPhone);
      if (!result.isValid || !result.e164) {
        failures.push({
          table: 'Order', id: o.id, field: 'clientPhone', value: o.clientPhone,
          reason: result.error ?? 'inválido', context: `clientName="${o.clientName}"`,
        });
        continue;
      }
      if (result.e164 === o.clientPhone) {
        skipped.orderPhone++;
        continue;
      }
      changes.push({
        table: 'Order', id: o.id, field: 'clientPhone',
        oldValue: o.clientPhone, newValue: result.e164,
        context: `clientName="${o.clientName}"`,
      });
      if (apply) {
        await pool.query('UPDATE orders SET "clientPhone"=$1 WHERE id=$2', [result.e164, o.id]);
      }
    }

    // --- Pass 4: Appointment.clientPhone ---
    const { rows: appointments } = await pool.query<{ id: string; clientName: string; clientPhone: string }>(
      'SELECT id, "clientName", "clientPhone" FROM appointments'
    );
    console.log(`Turnos a evaluar: ${appointments.length}\n`);

    for (const a of appointments) {
      if (!a.clientPhone) continue;
      const result = normalizeArgentinePhone(a.clientPhone);
      if (!result.isValid || !result.e164) {
        failures.push({
          table: 'Appointment', id: a.id, field: 'clientPhone', value: a.clientPhone,
          reason: result.error ?? 'inválido', context: `clientName="${a.clientName}"`,
        });
        continue;
      }
      if (result.e164 === a.clientPhone) {
        skipped.appointmentPhone++;
        continue;
      }
      changes.push({
        table: 'Appointment', id: a.id, field: 'clientPhone',
        oldValue: a.clientPhone, newValue: result.e164,
        context: `clientName="${a.clientName}"`,
      });
      if (apply) {
        await pool.query('UPDATE appointments SET "clientPhone"=$1 WHERE id=$2', [result.e164, a.id]);
      }
    }

    // --- Resumen ---
    console.log(`=== RESUMEN ===`);
    console.log(`Modo: ${mode}`);
    console.log(`Cambios totales: ${changes.length}`);
    console.log(`  - Client.phone:    ${changes.filter(c => c.table === 'Client' && c.field === 'phone').length} cambios | ${skipped.clientPhone} ya OK`);
    console.log(`  - Client.altPhone: ${changes.filter(c => c.table === 'Client' && c.field === 'altPhone').length} cambios | ${skipped.clientAltPhone} ya OK`);
    console.log(`  - Order.clientPhone: ${changes.filter(c => c.table === 'Order').length} cambios | ${skipped.orderPhone} ya OK`);
    console.log(`  - Appointment.clientPhone: ${changes.filter(c => c.table === 'Appointment').length} cambios | ${skipped.appointmentPhone} ya OK`);
    console.log(`Fallidos: ${failures.length}`);

    if (changes.length > 0) {
      console.log(`\n--- MUESTRA de cambios (primeros 15) ---`);
      for (const c of changes.slice(0, 15)) {
        console.log(`  [${c.table}.${c.field}] ${c.id} (${c.context}): "${c.oldValue}" → "${c.newValue}"`);
      }
      if (changes.length > 15) console.log(`  ... y ${changes.length - 15} más en el log`);
    }

    if (failures.length > 0) {
      console.log(`\n--- FALLIDOS ---`);
      for (const f of failures) {
        console.log(`  [${f.table}.${f.field}] ${f.id} (${f.context}): "${f.value}" → ${f.reason}`);
      }
    }

    // Log JSON
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const logPath = join(process.cwd(), 'scripts', `normalize-phones-${ts}.log.json`);
    writeFileSync(logPath, JSON.stringify({
      timestamp: ts,
      mode: apply ? 'apply' : 'dry-run',
      summary: {
        totalChanges: changes.length,
        totalFailures: failures.length,
        skipped,
      },
      changes,
      failures,
    }, null, 2));
    console.log(`\nLog escrito en: ${logPath}`);

    if (!apply && changes.length > 0) {
      console.log(`\n⚠️  Esto fue DRY RUN. Para aplicar:`);
      console.log(`   npx tsx scripts/normalize-phones.ts --apply\n`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Error en migración:', e);
  process.exit(1);
});
