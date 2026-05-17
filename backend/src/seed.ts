import * as dotenv from 'dotenv';
dotenv.config();
import { prisma } from './db.js';

async function main() {
  console.log("Sembrando datos de prueba...");

  // --- ZENCO: Ordenes de ropa ---
  await prisma.order.createMany({
    data: [
      {
        id: 'ORD-001',
        clientName: 'María López',
        clientPhone: '5491155551234',
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
        clientPhone: '5491166665678',
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
        clientPhone: '5491177779012',
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
        clientPhone: '5491144445555',
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
        clientPhone: '5491122223333',
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
        clientPhone: '5491177778888',
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

  await prisma.mgMasajesFinance.createMany({
    data: [
      { id: 'FIN-D1', date: '2026-04-01', type: 'income', category: 'Masajes', amount: 8000, description: 'Sesión Roberto G.' },
      { id: 'FIN-D2', date: '2026-04-02', type: 'expense', category: 'Insumos', amount: 4500, description: 'Aceites esenciales de Lavanda' }
    ],
    skipDuplicates: true
  });

  // --- CLIENTES ZENCO ---
  await prisma.client.createMany({
    data: [
      {
        id: 'CLI-Z1',
        name: 'María López',
        phone: '5491155551234',
        business: 'zenco',
        notes: 'Cliente frecuente, prefiere dobladillos a máquina.'
      },
      {
        id: 'CLI-Z2',
        name: 'Carlos Méndez',
        phone: '5491166665678',
        business: 'zenco',
        notes: 'Trae camperas de cuero para reparación de cierres.'
      },
      {
        id: 'CLI-Z3',
        name: 'Laura Fernández',
        phone: '5491177779012',
        business: 'zenco',
        notes: 'Solicita entalles para eventos y fiestas.'
      }
    ],
    skipDuplicates: true
  });

  // --- CLIENTES DAMIAN ---
  await prisma.client.createMany({
    data: [
      {
        id: 'CLI-D1',
        name: 'Roberto Gómez',
        phone: '5491144445555',
        business: 'damian',
        notes: 'Dolor lumbar crónico, viene cada 2 semanas.'
      },
      {
        id: 'CLI-D2',
        name: 'Elena Torres',
        phone: '5491122223333',
        business: 'damian',
        notes: 'Deportista amateur, maratones frecuentes.'
      },
      {
        id: 'CLI-D3',
        name: 'Carla Ruiz',
        phone: '5491177778888',
        business: 'damian',
        notes: 'Tratamiento de drenaje linfático post-quirúrgico.'
      }
    ],
    skipDuplicates: true
  });

  // --- FICHAS CLINICAS (Damian) ---
  await prisma.patientRecord.createMany({
    data: [
      {
        id: 'PAT-001',
        clientId: 'CLI-D1',
        date: '2026-04-01',
        reason: 'Contractura lumbar con irradiación a glúteo derecho',
        symptoms: 'Dolor agudo al inclinarse, rigidez matutina, sensación de ardor en zona L4-L5.',
        areas: 'Zona lumbar, glúteo derecho, cadena posterior de pierna derecha.',
        treatment: 'Masaje descontracturante profundo con maniobras de amasamiento y fricción transversal. Termoterapia local 10 min.',
        observations: 'Paciente presenta mucha tensión acumulada. Responde bien al calor previo. Reducción notable del dolor al finalizar la sesión.',
        nextSession: 'Continuar con descontracturante, incorporar estiramiento activo de psoas. Próxima cita en 10 días.'
      },
      {
        id: 'PAT-002',
        clientId: 'CLI-D2',
        date: '2026-04-03',
        reason: 'Recuperación muscular post-maratón',
        symptoms: 'Sobrecarga en cuádriceps y gemelos bilaterales, fatiga muscular generalizada, leve edema en tobillos.',
        areas: 'Cuádriceps, isquiotibiales, gemelos y sóleo bilateral. Planta del pie derecho.',
        treatment: 'Masaje deportivo con técnica de effleurage y petrissage en piernas completas. Presoterapia manual en tobillos. Estiramiento asistido al cierre.',
        observations: 'Excelente estado físico general. Recuperación más rápida de lo esperado para el volumen de la carrera (42 km). No presenta lesiones estructurales.',
        nextSession: 'Una sesión más de recuperación en 7 días, luego mantenimiento mensual según calendario de competencias.'
      },
      {
        id: 'PAT-003',
        clientId: 'CLI-D3',
        date: '2026-04-05',
        reason: 'Dolor cervical con cefalea tensional recurrente',
        symptoms: 'Rigidez en nuca, dolor que irradia hacia occipital y sienes, sensación de "cabeza pesada". Más intenso al final del día laboral.',
        areas: 'Región cervical alta y baja, trapecios, suboccipitales, hombros.',
        treatment: 'Drenaje linfático manual en zona cervical y facial. Masaje relajante en trapecios con aceite de lavanda. Técnica de inhibición suboccipital.',
        observations: 'La paciente trabaja muchas horas frente a pantalla sin pausas activas. Se recomienda corrección postural. Alivio inmediato post-sesión reportado por la paciente.',
        nextSession: 'Incorporar ejercicios de movilidad cervical en casa. Repetir sesión en 2 semanas. Evaluar progreso con y sin drenaje.'
      }
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
