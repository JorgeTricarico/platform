import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({ connectionString });

pool.on('error', (err) => {
  console.error('[DATABASE] Error inesperado en el pool de conexiones:', err);
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
