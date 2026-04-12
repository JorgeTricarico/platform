import { getPrismaClient } from './src/client.js';
import { randomUUID } from 'crypto';

const db = getPrismaClient();

async function main() {
  console.log('Seeding database...');

  // Users
  await db.user.upsert({
    where: { id: 'user-ana' },
    create: {
      id: 'user-ana',
      name: 'Ana',
      email: 'ana@zenco.com',
      passwordHash: '$2b$10$demo_hash', // demo password
      role: 'admin',
      tenantId: 'zenco',
    },
    update: {},
  });

  await db.user.upsert({
    where: { id: 'user-damian' },
    create: {
      id: 'user-damian',
      name: 'Damian',
      email: 'damian@mgmasajes.com',
      passwordHash: '$2b$10$demo_hash',
      role: 'admin',
      tenantId: 'mg_masajes',
    },
    update: {},
  });

  // Clients — zenco
  await db.client.upsert({
    where: { id: 'client-1' },
    create: {
      id: 'client-1',
      name: 'María González',
      phone: '1123456789',
      email: 'maria@example.com',
      business: 'zenco',
    },
    update: {},
  });

  // Sample Garment
  await db.garment.upsert({
    where: { id: 'garment-1' },
    create: {
      id: 'garment-1',
      tenantId: 'zenco',
      orderNumber: 'ORD-001',
      clientId: 'client-1',
      clientName: 'María González',
      clientPhone: '1123456789',
      repairType: 'Basta',
      description: 'Basta de pantalón negro',
      status: 'recibido',
      price: 3000,
      deposit: 1500,
    },
    update: {},
  });

  // Clients — mg_masajes
  await db.client.upsert({
    where: { id: 'client-2' },
    create: {
      id: 'client-2',
      name: 'Carlos Pérez',
      phone: '1198765432',
      business: 'mg_masajes',
    },
    update: {},
  });

  // Sample Appointment
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  await db.appointment.upsert({
    where: { id: 'appt-1' },
    create: {
      id: 'appt-1',
      tenantId: 'mg_masajes',
      clientId: 'client-2',
      clientName: 'Carlos Pérez',
      clientPhone: '1198765432',
      service: 'Masaje Relajante',
      date: tomorrow,
      duration: 60,
      price: 8000,
      status: 'pendiente',
    },
    update: {},
  });

  console.log('✓ Seed complete');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
