/**
 * C7: Migration script — generates SQL from Prisma schema.
 *
 * Usage:
 *   npx tsx scripts/migrate.ts          # Print SQL to stdout
 *   npx tsx scripts/migrate.ts --apply  # Apply directly to DB via pg
 *
 * This works from WSL where `prisma db push` fails.
 * Uses `prisma migrate diff --from-empty` to generate CREATE TABLE statements,
 * wraps them in IF NOT EXISTS for idempotency.
 */
import 'dotenv/config';
import { execSync } from 'child_process';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');

function generateSQL(): string {
  const raw = execSync(
    'npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script',
    { encoding: 'utf-8', cwd: process.cwd() }
  );

  // Make statements idempotent (avoid double IF NOT EXISTS)
  const idempotent = raw
    .replace(/CREATE TABLE (?!IF NOT EXISTS)/g, 'CREATE TABLE IF NOT EXISTS ')
    .replace(/CREATE UNIQUE INDEX (?!IF NOT EXISTS)/g, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
    .replace(/CREATE INDEX (?!IF NOT EXISTS)/g, 'CREATE INDEX IF NOT EXISTS ')
    .replace(/CREATE SCHEMA (?!IF NOT EXISTS)/g, 'CREATE SCHEMA IF NOT EXISTS ');

  return idempotent;
}

async function apply(sql: string) {
  const dbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: No DATABASE_URL or DIRECT_DATABASE_URL found in .env');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: dbUrl });
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    try {
      console.log('Executing migration...');
      await client.query(sql);
      console.log('Migration applied successfully!');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('Generating SQL from Prisma schema...\n');
  const sql = generateSQL();

  if (APPLY) {
    console.log('--- SQL to execute ---');
    console.log(sql);
    console.log('--- Applying ---');
    await apply(sql);
  } else {
    console.log('--- Copy this SQL to Supabase SQL Editor ---');
    console.log(sql);
    console.log('\n--- To apply directly, run: npx tsx scripts/migrate.ts --apply ---');
  }
}

main();
