import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("Sembrando datos de prueba...");

  // --- ZENCO: Ordenes de ropa ---
  await prisma.order.createMany({
    data: [
      {
        id: 'ORD-001',
        clientName: 'María López',
        clientPhone: '11-5555-1234',
        garmentName: 'Pantalón de Vestir',
        repairType: 'dobladillo',
        description: 'Acortar 3cm del largo',
        status: 'en_proceso',
        deliveryDate: '2026-04-07',
        price: 3500
      },
      {
        id: 'ORD-002',
        clientName: 'Carlos Méndez',
        clientPhone: '11-6666-5678',
        garmentName: 'Campera de Cuero',
        repairType: 'cierre',
        description: 'Cambio de cierre completo YKK',
        status: 'recibido',
        deliveryDate: '2026-04-10',
        price: 8500
      },
      {
        id: 'ORD-003',
        clientName: 'Laura Fernández',
        clientPhone: '11-7777-9012',
        garmentName: 'Vestido de Fiesta',
        repairType: 'entalle',
        description: 'Ajustar cintura y busto',
        status: 'listo',
        deliveryDate: '2026-04-05',
        price: 6000
      }
    ],
    skipDuplicates: true
  });

  await prisma.zencoFinance.createMany({
    data: [
      { id: 'FIN-Z1', date: '2026-04-01', type: 'income', category: 'Arreglos', amount: 3500, description: 'Dobladillo pantalón María L.' },
      { id: 'FIN-Z2', date: '2026-04-02', type: 'expense', category: 'Insumos', amount: 1200, description: 'Hilos y agujas especiales' },
      { id: 'FIN-Z3', date: '2026-04-03', type: 'income', category: 'Diseño', amount: 12000, description: 'Diseño vestido a medida' }
    ],
    skipDuplicates: true
  });

  // --- DAMIAN: Citas de masajes ---
  await prisma.appointment.createMany({
    data: [
      {
        id: 'APT-001',
        clientName: 'Roberto Gómez',
        clientPhone: '11-4444-5555',
        service: 'Masaje Descontracturante',
        duration: 60,
        date: '2026-04-10',
        time: '15:00',
        status: 'confirmado',
        price: 8000,
        notes: 'Dolor lumbar crónico.'
      },
      {
        id: 'APT-002',
        clientName: 'Elena Torres',
        clientPhone: '11-2222-3333',
        service: 'Masaje Deportivo',
        duration: 90,
        date: '2026-04-12',
        time: '10:30',
        status: 'pendiente',
        price: 12000,
        notes: 'Recuperación post-maratón.'
      },
      {
        id: 'APT-003',
        clientName: 'Carla Ruiz',
        clientPhone: '11-7777-8888',
        service: 'Drenaje Linfático',
        duration: 60,
        date: '2026-04-05',
        time: '18:00',
        status: 'completado',
        price: 9500
      }
    ],
    skipDuplicates: true
  });

  await prisma.damianFinance.createMany({
    data: [
      { id: 'FIN-D1', date: '2026-04-01', type: 'income', category: 'Masajes', amount: 8000, description: 'Sesión Roberto G.' },
      { id: 'FIN-D2', date: '2026-04-02', type: 'expense', category: 'Insumos', amount: 4500, description: 'Aceites esenciales de Lavanda' }
    ],
    skipDuplicates: true
  });

  console.log("Seed completado para Zenco y Damian!");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
