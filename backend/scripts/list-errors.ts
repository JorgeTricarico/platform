/**
 * Lista errores reportados por el frontend/backend desde la tabla error_logs.
 *
 * Uso:
 *   npx tsx backend/scripts/list-errors.ts                  # ultimos 20 no resueltos
 *   npx tsx backend/scripts/list-errors.ts --all            # incluye resueltos
 *   npx tsx backend/scripts/list-errors.ts --limit=50       # custom limit
 *   npx tsx backend/scripts/list-errors.ts --all --limit=5  # combinable
 *
 * Usa pg directo (no Prisma) — mismo patron que scripts/normalize-phones.ts.
 */

import pg from 'pg';
import { config } from 'dotenv';

config();

type Row = {
  id: string;
  business: string | null;
  source: string;
  level: string;
  message: string;
  stack: string | null;
  url: string | null;
  userAgent: string | null;
  userName: string | null;
  metadata: Record<string, unknown> | null;
  resolved: boolean;
  createdAt: Date;
};

function parseArgs(argv: string[]): { all: boolean; limit: number } {
  const all = argv.includes('--all');
  const limitArg = argv.find((a) => a.startsWith('--limit='));
  let limit = 20;
  if (limitArg) {
    const v = parseInt(limitArg.split('=')[1] ?? '', 10);
    if (!isNaN(v) && v > 0) limit = v;
  }
  return { all, limit };
}

function formatDate(d: Date): string {
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

async function main() {
  const { all, limit } = parseArgs(process.argv.slice(2));

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 30000,
    query_timeout: 60000,
  });

  try {
    const where = all ? '' : 'WHERE "resolved" = false';
    const sql = `
      SELECT id, business, source, level, message, stack, url, "userAgent", "userName", metadata, resolved, "createdAt"
      FROM error_logs
      ${where}
      ORDER BY "createdAt" DESC
      LIMIT $1
    `;
    const { rows } = await pool.query<Row>(sql, [limit]);

    const title = all
      ? `=== Ultimos ${rows.length} errores (todos) ===`
      : `=== Ultimos ${rows.length} errores no resueltos ===`;
    console.log(`\n${title}\n`);

    if (rows.length === 0) {
      console.log('  (sin errores)');
      return;
    }

    for (const r of rows) {
      const fecha = formatDate(r.createdAt);
      const business = r.business ?? '-';
      const flagResolved = r.resolved ? ' [RESUELTO]' : '';
      console.log(`[${fecha}] [${business}] [${r.source}/${r.level}]${flagResolved} ${r.message}`);
      if (r.url) console.log(`  URL: ${r.url}`);
      if (r.userName) console.log(`  User: ${r.userName}`);
      if (r.userAgent) console.log(`  UA: ${r.userAgent.slice(0, 100)}`);
      if (r.stack) {
        const lines = r.stack.split('\n').slice(0, 5);
        console.log(`  Stack:`);
        for (const ln of lines) console.log(`    ${ln}`);
      }
      if (r.metadata && Object.keys(r.metadata).length > 0) {
        console.log(`  Metadata: ${JSON.stringify(r.metadata)}`);
      }
      console.log(`  ID: ${r.id}`);
      console.log('');
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Error listando errores:', e);
  process.exit(1);
});
