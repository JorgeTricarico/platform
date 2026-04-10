import { Router } from 'express';
import { prisma } from '../db.js';
import { validate, createAppointmentSchema, updateAppointmentSchema, updateAppointmentStatusSchema, createFinanceSchema, updateFinanceSchema, createClientSchema, updateClientSchema, createPatientRecordSchema, updatePatientRecordSchema } from '../schemas.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// --- CONFLICT DETECTION HELPERS ---

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

async function findConflict(date: string, time: string, duration: number, excludeId?: string) {
  const newStart = timeToMinutes(time);
  const newEnd = newStart + duration;
  const existing = await prisma.appointment.findMany({
    where: {
      date,
      status: { not: 'cancelado' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  return existing.find(a => {
    const s = timeToMinutes(a.time);
    const e = s + a.duration;
    return newStart < e && newEnd > s;
  }) ?? null;
}

// --- CITAS (APPOINTMENTS) ---

router.get('/appointments', asyncHandler(async (req, res) => {
  const appointments = await prisma.appointment.findMany({
    orderBy: { date: 'asc' }
  });
  res.json(appointments);
}));

router.post('/appointments', validate(createAppointmentSchema), asyncHandler(async (req, res) => {
  const data = req.body;
  const conflict = await findConflict(data.date, data.time, data.duration);
  if (conflict) {
    res.status(409).json({ error: 'Conflicto de horario', conflictWith: conflict.id });
    return;
  }

  // Ensure client is registered in the database
  await prisma.client.upsert({
    where: { phone_business: { phone: data.clientPhone, business: 'damian' } },
    update: { name: data.clientName }, // Update name in case it changed
    create: {
      name: data.clientName,
      phone: data.clientPhone,
      business: 'damian'
    }
  });

  const newAppointment = await prisma.appointment.create({
    data: {
      id: `APT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      service: data.service,
      duration: data.duration,
      date: data.date,
      time: data.time,
      status: data.status || 'pendiente',
      price: data.price,
      notes: data.notes,
      location: data.location || 'Consultorio'
    }
  });
  res.json(newAppointment);
}));

router.put('/appointments/:id/status', validate(updateAppointmentStatusSchema), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const { status } = req.body;
  const updated = await prisma.appointment.update({
    where: { id },
    data: { status }
  });
  res.json(updated);
}));

router.put('/appointments/:id', validate(updateAppointmentSchema), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const data = req.body;
  if (data.date && data.time && data.duration) {
    const conflict = await findConflict(data.date, data.time, data.duration, id);
    if (conflict) {
      res.status(409).json({ error: 'Conflicto de horario', conflictWith: conflict.id });
      return;
    }
  }
  const updated = await prisma.appointment.update({
    where: { id },
    data,
  });
  res.json(updated);
}));

router.delete('/appointments/:id', asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  await prisma.appointment.delete({ where: { id } });
  res.json({ success: true });
}));

// --- FINANZAS DAMIAN ---

// Helper: get month range for a YYYY-MM string
function getMonthRange(yearMonth: string): { start: string; end: string } {
  const [year, month] = yearMonth.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

router.get('/finances', asyncHandler(async (req, res) => {
  const month = req.query.month as string | undefined;
  let where = {};
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const range = getMonthRange(month);
    where = { date: { gte: range.start, lte: range.end } };
  }
  const finances = await prisma.damianFinance.findMany({
    where,
    orderBy: { date: 'desc' }
  });
  res.json(finances);
}));

router.post('/finances', validate(createFinanceSchema), asyncHandler(async (req, res) => {
  const data = req.body;
  const entry = await prisma.damianFinance.create({
    data: {
      id: `FIN-D-${Date.now()}`,
      date: data.date,
      type: data.type,
      category: data.category,
      amount: data.amount,
      description: data.description
    }
  });
  res.json(entry);
}));

router.put('/finances/:id', validate(updateFinanceSchema), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const data = req.body;
  const updated = await prisma.damianFinance.update({ where: { id }, data });
  res.json(updated);
}));

router.delete('/finances/:id', asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  await prisma.damianFinance.delete({ where: { id } });
  res.json({ success: true });
}));

// --- CLIENTES DAMIAN ---

router.get('/clients', asyncHandler(async (req, res) => {
  const clients = await prisma.client.findMany({
    where: { business: 'damian' },
    orderBy: { createdAt: 'desc' }
  });
  res.json(clients);
}));

router.post('/clients', validate(createClientSchema), asyncHandler(async (req, res) => {
  const data = req.body;
  const client = await prisma.client.upsert({
    where: { phone_business: { phone: data.phone, business: 'damian' } },
    update: { name: data.name, altPhone: data.altPhone },
    create: {
      name: data.name,
      phone: data.phone,
      altPhone: data.altPhone,
      business: 'damian',
    }
  });
  res.json(client);
}));

router.put('/clients/:id', validate(updateClientSchema), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const data = req.body;
  const updated = await prisma.client.update({
    where: { id },
    data: {
      name: data.name,
      altPhone: data.altPhone,
    }
  });
  res.json(updated);
}));

router.get('/clients/search', asyncHandler(async (req, res) => {
  const q = (req.query.q as string || '').trim();
  if (!q) {
    res.json([]);
    return;
  }
  const clients = await prisma.client.findMany({
    where: {
      business: 'damian',
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { altPhone: { contains: q } },
      ]
    }
  });
  res.json(clients);
}));

// --- HISTORIAL DE CLIENTE ---

router.get('/clients/:id/history', asyncHandler(async (req, res, next) => {
  const id = req.params.id as string;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    res.status(404).json({ error: 'Cliente no encontrado' });
    return;
  }

  // Normalizamos el teléfono para la búsqueda (solo dígitos)
  const cleanPhone = client.phone.replace(/\D/g, '');

  const [allAppointments, records] = await Promise.all([
    prisma.appointment.findMany({
      orderBy: { date: 'desc' },
    }),
    prisma.patientRecord.findMany({
      where: { clientId: id },
      orderBy: { date: 'desc' },
    }),
  ]);

  // Filtramos appointments por teléfono o nombre
  const appointments = allAppointments.filter(a => {
    const apptPhone = a.clientPhone.replace(/\D/g, '');
    return apptPhone === cleanPhone || a.clientName.toLowerCase() === client.name.toLowerCase();
  });

  res.json({
    client,
    appointments,
    records,
    summary: {
      totalAppointments: appointments.length,
      totalRecords: records.length,
    },
  });
}));

// --- FICHAS CLINICAS ---

router.get('/patients/:clientId/records', asyncHandler(async (req, res) => {
  const clientId = req.params.clientId as string;
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }
  const records = await prisma.patientRecord.findMany({
    where: { clientId },
    orderBy: { date: 'desc' }
  });
  res.json(records);
}));

router.post('/patients/:clientId/records', validate(createPatientRecordSchema), asyncHandler(async (req, res) => {
  const clientId = req.params.clientId as string;
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }
  const data = req.body;
  const record = await prisma.patientRecord.create({
    data: {
      clientId,
      date: data.date,
      reason: data.reason,
      symptoms: data.symptoms,
      areas: data.areas,
      treatment: data.treatment,
      observations: data.observations,
      nextSession: data.nextSession,
    }
  });
  res.json(record);
}));

router.put('/patients/records/:id', validate(updatePatientRecordSchema), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const data = req.body;
  const record = await prisma.patientRecord.update({
    where: { id },
    data: {
      reason: data.reason,
      symptoms: data.symptoms,
      areas: data.areas,
      treatment: data.treatment,
      observations: data.observations,
      nextSession: data.nextSession,
    }
  });
  res.json(record);
}));

// --- DASHBOARD ---

router.get('/dashboard/today', asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const appointments = await prisma.appointment.findMany({
    where: { date: today },
    orderBy: { time: 'asc' },
  });
  res.json(appointments);
}));

router.get('/dashboard/appointments', asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const appointments = await prisma.appointment.findMany({
    where: {
      date: { gte: today },
      status: { not: 'cancelado' },
    },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  });
  res.json(appointments);
}));

// D28: Monthly income summary
router.get('/dashboard/monthly-income', asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.slice(0, 7);
  const range = getMonthRange(currentMonth);

  const finances = await prisma.damianFinance.findMany({
    where: { date: { gte: range.start, lte: range.end } },
  });

  const monthlyIncome = finances.filter(f => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
  const monthlyExpenses = finances.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);

  res.json({ monthlyIncome, monthlyExpenses });
}));

router.get('/dashboard/stale-patients', asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

  const clients = await prisma.client.findMany({ where: { business: 'damian' }, orderBy: { name: 'asc' } });
  const clientIds = clients.map(c => c.id);

  const allRecords = await prisma.patientRecord.findMany({
    where: { clientId: { in: clientIds } },
    orderBy: { date: 'desc' },
    select: { clientId: true, date: true, reason: true },
  });

  const latestByClient = new Map<string, { date: string; reason: string | null }>();
  for (const r of allRecords) {
    if (!latestByClient.has(r.clientId)) {
      latestByClient.set(r.clientId, { date: r.date, reason: r.reason });
    }
  }

  const stale = clients
    .filter(c => {
      const last = latestByClient.get(c.id);
      return !last || last.date <= cutoff;
    })
    .map(c => {
      const last = latestByClient.get(c.id);
      return { ...c, lastVisit: last?.date ?? null, lastReason: last?.reason ?? null };
    });

  res.json(stale);
}));

// D29: Next appointment for a patient
router.get('/patients/:clientId/next-appointment', asyncHandler(async (req, res) => {
  const clientId = req.params.clientId as string;
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    res.status(404).json({ error: 'Paciente no encontrado' });
    return;
  }
  const today = new Date().toISOString().split('T')[0];
  const appointment = await prisma.appointment.findFirst({
    where: {
      clientName: client.name,
      date: { gte: today },
      status: { notIn: ['cancelado', 'completado'] },
    },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  });
  res.json(appointment ?? null);
}));

// Pacientes con sus fichas (lista para la vista principal)
router.get('/patients', asyncHandler(async (req, res) => {
  const clients = await prisma.client.findMany({
    where: { business: 'damian' },
    orderBy: { name: 'asc' },
  });

  const clientIds = clients.map(c => c.id);

  const [allRecords, countGroups] = await Promise.all([
    prisma.patientRecord.findMany({
      where: { clientId: { in: clientIds } },
      orderBy: { date: 'desc' },
      select: { clientId: true, date: true, reason: true },
    }),
    prisma.patientRecord.groupBy({
      by: ['clientId'],
      where: { clientId: { in: clientIds } },
      _count: { _all: true },
    }),
  ]);

  const latestByClient = new Map<string, { date: string; reason: string | null }>();
  for (const r of allRecords) {
    if (!latestByClient.has(r.clientId)) {
      latestByClient.set(r.clientId, { date: r.date, reason: r.reason });
    }
  }
  const countByClient = new Map(countGroups.map(g => [g.clientId, g._count._all]));

  const patientsWithInfo = clients.map(c => ({
    ...c,
    totalRecords: countByClient.get(c.id) ?? 0,
    lastVisit: latestByClient.get(c.id)?.date ?? null,
    lastReason: latestByClient.get(c.id)?.reason ?? null,
  }));

  res.json(patientsWithInfo);
}));

export { router as damianRoutes };
