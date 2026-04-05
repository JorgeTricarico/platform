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
        deliveryDate: data.deliveryDate,
        price: data.price
      }
    });
    res.json(newGarment);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear orden' });
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

export { router as zencoRoutes };
