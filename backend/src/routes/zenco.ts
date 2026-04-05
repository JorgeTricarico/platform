import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

// --- PRENDAS (ORDERS) ---

router.get('/garments', async (req, res) => {
  try {
    const garments = await prisma.order.findMany({
      orderBy: { deliveryDate: 'asc' }
    });
    res.json(garments);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener prendas' });
  }
});

router.post('/garments', async (req, res) => {
  try {
    const data = req.body;
    const newGarment = await prisma.order.create({
      data: {
        id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        garmentName: data.garmentName,
        repairType: data.repairType,
        description: data.description,
        status: data.status || 'recibido',
        intakeDate: data.intakeDate || new Date().toISOString().split('T')[0],
        deliveryDate: data.deliveryDate,
        price: Number(data.price)
      }
    });
    res.json(newGarment);
  } catch (error) {
    console.error('Error al crear orden:', error);
    res.status(500).json({ error: 'Error al crear orden', details: String(error) });
  }
});

router.put('/garments/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await prisma.order.update({
      where: { id },
      data: { status }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

router.put('/garments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await prisma.order.update({
      where: { id },
      data: {
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        garmentName: data.garmentName,
        repairType: data.repairType,
        description: data.description,
        status: data.status,
        intakeDate: data.intakeDate,
        deliveryDate: data.deliveryDate,
        price: Number(data.price)
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar orden' });
  }
});

router.delete('/garments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.order.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar orden' });
  }
});

// --- FINANZAS ZENCO ---

router.get('/finances', async (req, res) => {
  try {
    const finances = await prisma.zencoFinance.findMany({
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
    const entry = await prisma.zencoFinance.create({
      data: {
        id: `FIN-Z-${Date.now()}`,
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

// --- CLIENTES ZENCO ---

router.get('/clients', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { business: 'zenco' },
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
    // Upsert: si ya existe por telefono, actualizar
    const client = await prisma.client.upsert({
      where: { phone_business: { phone: data.phone, business: 'zenco' } },
      update: { name: data.name, altPhone: data.altPhone, email: data.email, notes: data.notes },
      create: {
        name: data.name,
        phone: data.phone,
        altPhone: data.altPhone,
        email: data.email,
        business: 'zenco',
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
        business: 'zenco',
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

export { router as zencoRoutes };
