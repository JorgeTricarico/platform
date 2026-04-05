import { Router } from 'express';
import { prisma } from '../db.js';

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

router.post('/appointments', async (req, res) => {
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
        notes: data.notes
      }
    });
    res.json(newAppointment);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear cita' });
  }
});

router.put('/appointments/:id/status', async (req, res) => {
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

router.post('/finances', async (req, res) => {
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

router.post('/clients', async (req, res) => {
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

router.post('/patients/:clientId/records', async (req, res) => {
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

router.put('/patients/records/:id', async (req, res) => {
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
