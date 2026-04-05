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

export { router as damianRoutes };
