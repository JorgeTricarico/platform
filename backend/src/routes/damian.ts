import { Router } from 'express';
import { prisma } from '../db.js';
import { validate, createAppointmentSchema, updateStatusSchema, createFinanceSchema, createClientSchema, createPatientRecordSchema, updatePatientRecordSchema } from '../schemas.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// --- CITAS (APPOINTMENTS) ---

router.get('/appointments', asyncHandler(async (req, res) => {
  const appointments = await prisma.appointment.findMany({
    orderBy: { date: 'asc' }
  });
  res.json(appointments);
}));

router.post('/appointments', validate(createAppointmentSchema), asyncHandler(async (req, res) => {
  const data = req.body;
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

router.put('/appointments/:id/status', validate(updateStatusSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const updated = await prisma.appointment.update({
    where: { id },
    data: { status }
  });
  res.json(updated);
}));

// --- FINANZAS DAMIAN ---

router.get('/finances', asyncHandler(async (req, res) => {
  const finances = await prisma.damianFinance.findMany({
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
    update: { name: data.name, altPhone: data.altPhone, email: data.email, notes: data.notes },
    create: {
      name: data.name,
      phone: data.phone,
      altPhone: data.altPhone,
      email: data.email,
      business: 'damian',
      notes: data.notes,
    }
  });
  res.json(client);
}));

router.get('/clients/search', asyncHandler(async (req, res) => {
  const q = (req.query.q as string || '').toLowerCase();
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

// --- FICHAS CLINICAS ---

router.get('/patients/:clientId/records', asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const records = await prisma.patientRecord.findMany({
    where: { clientId },
    orderBy: { date: 'desc' }
  });
  res.json(records);
}));

router.post('/patients/:clientId/records', validate(createPatientRecordSchema), asyncHandler(async (req, res) => {
  const { clientId } = req.params;
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
  const { id } = req.params;
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

router.get('/dashboard/stale-patients', asyncHandler(async (req, res) => {
  const clients = await prisma.client.findMany({
    where: { business: 'damian' },
    orderBy: { name: 'asc' },
  });
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

  const stale = [];
  for (const c of clients) {
    const records = await prisma.patientRecord.findMany({
      where: { clientId: c.id },
      orderBy: { date: 'desc' },
      take: 1,
    });
    const lastRecord = records[0];
    if (!lastRecord || lastRecord.date <= cutoff) {
      stale.push({
        ...c,
        lastVisit: lastRecord?.date || null,
        lastReason: lastRecord?.reason || null,
      });
    }
  }
  res.json(stale);
}));

// Pacientes con sus fichas (lista para la vista principal)
router.get('/patients', asyncHandler(async (req, res) => {
  const clients = await prisma.client.findMany({
    where: { business: 'damian' },
    orderBy: { name: 'asc' }
  });
  // For each client, get count of records and last visit
  const patientsWithInfo = await Promise.all(clients.map(async (c) => {
    const records = await prisma.patientRecord.findMany({
      where: { clientId: c.id },
      orderBy: { date: 'desc' },
      take: 1,
    });
    const totalRecords = await prisma.patientRecord.count({ where: { clientId: c.id } });
    return {
      ...c,
      totalRecords,
      lastVisit: records[0]?.date || null,
      lastReason: records[0]?.reason || null,
    };
  }));
  res.json(patientsWithInfo);
}));

export { router as damianRoutes };
