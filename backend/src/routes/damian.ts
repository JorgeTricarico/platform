import { Router } from 'express';
import { prisma } from '../db.js';
import { validate, createAppointmentSchema, updateStatusSchema, createFinanceSchema, createClientSchema, createPatientRecordSchema, updatePatientRecordSchema } from '../schemas.js';

const router = Router();

// --- CITAS (APPOINTMENTS) ---

router.get('/appointments', async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: { date: 'asc' }
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener citas' });
  }
});

router.post('/appointments', validate(createAppointmentSchema), async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: 'Error al crear cita' });
  }
});

router.put('/appointments/:id/status', validate(updateStatusSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await prisma.appointment.update({
      where: { id },
      data: { status }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar status de cita' });
  }
});

// --- FINANZAS DAMIAN ---

router.get('/finances', async (req, res) => {
  try {
    const finances = await prisma.damianFinance.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(finances);
  } catch (error) {
    res.status(500).json({ error: 'Error de finanzas' });
  }
});

router.post('/finances', validate(createFinanceSchema), async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: 'Error al crear registro financiero' });
  }
});

// --- CLIENTES DAMIAN ---

router.get('/clients', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { business: 'damian' },
      orderBy: { createdAt: 'desc' }
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

router.post('/clients', validate(createClientSchema), async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar cliente' });
  }
});

router.get('/clients/search', async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: 'Error buscando cliente' });
  }
});

// --- FICHAS CLINICAS ---

router.get('/patients/:clientId/records', async (req, res) => {
  try {
    const { clientId } = req.params;
    const records = await prisma.patientRecord.findMany({
      where: { clientId },
      orderBy: { date: 'desc' }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener fichas clinicas' });
  }
});

router.post('/patients/:clientId/records', validate(createPatientRecordSchema), async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: 'Error al crear ficha clinica' });
  }
});

router.put('/patients/records/:id', validate(updatePatientRecordSchema), async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar ficha clinica' });
  }
});

// --- DASHBOARD ---

router.get('/dashboard/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const appointments = await prisma.appointment.findMany({
      where: { date: today },
      orderBy: { time: 'asc' },
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener turnos de hoy' });
  }
});

router.get('/dashboard/appointments', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const appointments = await prisma.appointment.findMany({
      where: {
        date: { gte: today },
        status: { not: 'cancelado' },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener citas agendadas' });
  }
});

router.get('/dashboard/stale-patients', async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pacientes sin ficha reciente' });
  }
});

// Pacientes con sus fichas (lista para la vista principal)
router.get('/patients', async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pacientes' });
  }
});

export { router as damianRoutes };
