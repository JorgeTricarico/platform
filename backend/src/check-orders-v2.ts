import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkOrders() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        clientName: true,
        intakeDate: true
      }
    });

    console.log('ID | OrderNumber | CreatedAt | IntakeDate | Client');
    console.log('---|-------------|-----------|------------|-------');
    orders.forEach(o => {
      console.log(`${o.id.slice(0, 8)}... | ${String(o.orderNumber).padStart(5, '0')} | ${o.createdAt.toISOString()} | ${o.intakeDate} | ${o.clientName}`);
    });
  } catch (err) {
    console.error('Error querying orders:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

checkOrders();
