/**
 * C7: Migration script — generates and applies SQL from Prisma schema.
 *
 * Usage:
 *   npx tsx scripts/migrate.ts              # Print diff SQL to stdout
 *   npx tsx scripts/migrate.ts --apply      # Apply diff directly to DB via pg
 *   npx tsx scripts/migrate.ts --from-empty # Legacy: full CREATE from scratch
 *
 * This works from WSL where `prisma db push` fails.
 * By default, diffs the CURRENT DB state against the schema (generates only ALTERs).
 * Use --from-empty for initial setup on a blank database.
 */
import 'dotenv/config';
import { execSync } from 'child_process';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');
const FROM_EMPTY = process.argv.includes('--from-empty');

function getDbUrl(): string {
  const dbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: No DATABASE_URL or DIRECT_DATABASE_URL found in .env');
    process.exit(1);
  }
  return dbUrl;
}

function generateSQL(): string {
  let fromArg: string;
  if (FROM_EMPTY) {
    fromArg = '--from-empty';
  } else {
    const dbUrl = getDbUrl();
    fromArg = `--from-url "${dbUrl}"`;
  }

  const raw = execSync(
    `npx prisma migrate diff ${fromArg} --to-schema prisma/schema.prisma --script`,
    { encoding: 'utf-8', cwd: process.cwd() }
  );

  if (FROM_EMPTY) {
    // Make CREATE statements idempotent
    return raw
      .replace(/CREATE TABLE (?!IF NOT EXISTS)/g, 'CREATE TABLE IF NOT EXISTS ')
      .replace(/CREATE UNIQUE INDEX (?!IF NOT EXISTS)/g, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
      .replace(/CREATE INDEX (?!IF NOT EXISTS)/g, 'CREATE INDEX IF NOT EXISTS ')
      .replace(/CREATE SCHEMA (?!IF NOT EXISTS)/g, 'CREATE SCHEMA IF NOT EXISTS ');
  }

  return raw;
}

async function apply(sql: string) {
  const dbUrl = getDbUrl();
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
    console.log(FROM_EMPTY ? '--- Full schema SQL ---' : '--- Diff SQL (changes only) ---');
    console.log(sql);
    console.log('\n--- To apply directly, run: npx tsx scripts/migrate.ts --apply ---');
  }
}

main();
