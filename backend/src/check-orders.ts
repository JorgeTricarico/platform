import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOrders() {
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
    console.log(`${o.id.slice(0, 8)}... | ${o.orderNumber} | ${o.createdAt.toISOString()} | ${o.intakeDate} | ${o.clientName}`);
  });
}

checkOrders()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
