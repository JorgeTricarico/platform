import { Router } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../db.js';
import { validate, createGarmentSchema, updateGarmentSchema, updateStatusSchema, createFinanceSchema, updateFinanceSchema, createClientSchema, updateClientSchema } from '../schemas.js';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { whatsappService } from '../services/whatsapp.js';

const router = Router();

// --- DASHBOARD ---

router.get('/dashboard', asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  const currentMonth = today.slice(0, 7); // YYYY-MM
  const monthRange = getMonthRange(currentMonth);

  const [statusGroups, todayDeliveries, upcomingDeliveries, monthFinances] = await Promise.all([
    prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.order.findMany({
      where: { deliveryDate: today },
      orderBy: { clientName: 'asc' },
    }),
    prisma.order.findMany({
      where: { deliveryDate: { gt: today, lte: in3Days } },
      orderBy: { deliveryDate: 'asc' },
    }),
    prisma.zencoFinance.findMany({
      where: { date: { gte: monthRange.start, lte: monthRange.end } },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const group of statusGroups) {
    byStatus[group.status] = group._count._all;
  }

  const monthlyIncome = monthFinances.filter((f: { type: string }) => f.type === 'income').reduce((sum: number, f: { amount: number }) => sum + f.amount, 0);
  const monthlyExpenses = monthFinances.filter((f: { type: string }) => f.type === 'expense').reduce((sum: number, f: { amount: number }) => sum + f.amount, 0);

  res.json({ byStatus, todayDeliveries, upcomingDeliveries, monthlyIncome, monthlyExpenses });
}));

// Z25: Garments with status 'listo' and not picked up for > 7 days
// Uses statusChangedAt (when it became 'listo') if available, falls back to deliveryDate
router.get('/dashboard/stale-garments', asyncHandler(async (req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const allListo = await prisma.order.findMany({
    where: { status: 'listo' },
    orderBy: { deliveryDate: 'asc' },
  });
  const garments = allListo.filter((g: { statusChangedAt?: string | null; deliveryDate: string }) => {
    const referenceDate = g.statusChangedAt ?? g.deliveryDate;
    return referenceDate < sevenDaysAgo;
  });
  res.json(garments);
}));

// --- PRENDAS (ORDERS) ---

router.get('/garments', asyncHandler(async (req, res) => {
  const garments = await prisma.order.findMany({
    orderBy: { deliveryDate: 'asc' }
  });
  res.json(garments);
}));

router.post('/garments', validate(createGarmentSchema), asyncHandler(async (req, res) => {
  const data = req.body;

  // Ensure client is registered in the database
  await prisma.client.upsert({
    where: { phone_business: { phone: data.clientPhone, business: 'zenco' } },
    update: { name: data.clientName }, // Update name in case it changed
    create: {
      name: data.clientName,
      phone: data.clientPhone,
      business: 'zenco'
    }
  });

  const newGarment = await prisma.order.create({
    data: {
      id: randomUUID(),
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      garmentName: data.garmentName,
      repairType: data.repairType,
      description: data.description,
      status: data.status || 'recibido',
      intakeDate: data.intakeDate || new Date().toISOString(),
      deliveryDate: data.deliveryDate,
      price: Number(data.price),
      deposit: Number(data.deposit || 0),
      location: data.location || null
    }
  });

  if (newGarment.deposit > 0) {
    try {
      await prisma.zencoFinance.create({
        data: {
          id: `FIN-Z-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'income',
          category: 'seña_arreglo',
          amount: newGarment.deposit,
          description: `Seña: ${newGarment.garmentName} — ${newGarment.clientName}`,
        },
      });
    } catch {}
  }

  res.json(newGarment);
}));

router.put('/garments/:id/status', validate(updateStatusSchema), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const { status } = req.body;
  const prev = await prisma.order.findUnique({ where: { id } });
  if (!prev) throw new NotFoundError('Orden no encontrada');

  // When delivering, set deposit = price so the garment shows as fully paid
  const extraData = status === 'entregado' ? { deposit: prev.price } : {};

  const updated = await prisma.order.update({
    where: { id },
    data: { status, statusChangedAt: new Date().toISOString(), ...extraData }
  });

  // When a garment is marked as ready, create a client notification + send WhatsApp
  if (status === 'listo') {
    const client = await prisma.client.findFirst({
      where: { phone: updated.clientPhone, business: 'zenco' },
    });
    if (client) {
      await prisma.notification.create({
        data: {
          clientId: client.id,
          message: `Tu prenda "${updated.garmentName}" está lista para retirar.`,
          type: 'prenda_lista',
          read: false,
        },
      });
    }

    // Z7: WhatsApp notification — non-blocking
    try {
      await whatsappService.sendMessage(
        updated.clientPhone,
        `Hola ${updated.clientName}, tu prenda "${updated.garmentName}" está lista para retirar!`
      );
    } catch {
      // WhatsApp failure must not block status update
    }
  }

  // Z10 & Z11: Auto-create income when garment is delivered for the remaining balance.
  // Also handles re-scanning already-entregado garments that had no payment recorded yet.
  // Uses a deterministic ID (ORD number) so upsert is idempotent — no duplicate records.
  // Balance uses prev.deposit (before it was set to price) to capture the original advance.
  if (status === 'entregado') {
    const balance = updated.price - prev.deposit;
    if (balance > 0) {
      const finId = `FIN-Z-DEL-${updated.orderNumber}`;
      try {
        await prisma.zencoFinance.upsert({
          where: { id: finId },
          update: { amount: balance, date: new Date().toISOString().split('T')[0] },
          create: {
            id: finId,
            date: new Date().toISOString().split('T')[0],
            type: 'income',
            category: 'entrega_prenda',
            amount: balance,
            description: `Saldo: ${updated.garmentName} — ${updated.clientName}`,
          },
        });
      } catch {
        // Finance failure must not block status update
      }
    }
  }

  res.json(updated);
}));

router.put('/garments/:id', validate(updateGarmentSchema), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const data = req.body;
  const prev = await prisma.order.findUnique({ where: { id } });
  if (!prev) throw new NotFoundError('Orden no encontrada');

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
      price: Number(data.price),
      deposit: Number(data.deposit || 0),
      location: data.location ?? undefined
    }
  });

  if (data.status === 'entregado' && prev.status !== 'entregado') {
    const balance = updated.price - updated.deposit;
    if (balance > 0) {
      const finId = `FIN-Z-DEL-${updated.orderNumber}`;
      try {
        await prisma.zencoFinance.upsert({
          where: { id: finId },
          update: { amount: balance, date: new Date().toISOString().split('T')[0] },
          create: {
            id: finId,
            date: new Date().toISOString().split('T')[0],
            type: 'income',
            category: 'entrega_prenda',
            amount: balance,
            description: `Saldo: ${updated.garmentName} — ${updated.clientName}`,
          },
        });
      } catch {}
    }
  }

  res.json(updated);
}));

router.delete('/garments/:id', asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  await prisma.garmentPhoto.deleteMany({ where: { garmentId: id } });
  await prisma.order.delete({ where: { id } });
  res.json({ success: true });
}));

// --- FINANZAS ZENCO ---

router.get('/finances', asyncHandler(async (req, res) => {
  const month = req.query.month as string | undefined;
  let where = {};
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const range = getMonthRange(month);
    where = { date: { gte: range.start, lte: range.end } };
  }
  const finances = await prisma.zencoFinance.findMany({
    where,
    orderBy: { date: 'desc' }
  });
  res.json(finances);
}));

router.post('/finances', validate(createFinanceSchema), asyncHandler(async (req, res) => {
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
}));

router.put('/finances/:id', validate(updateFinanceSchema), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const data = req.body;
  const updated = await prisma.zencoFinance.update({ where: { id }, data });
  res.json(updated);
}));

router.delete('/finances/:id', asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  await prisma.zencoFinance.delete({ where: { id } });
  res.json({ success: true });
}));

// --- CLIENTES ZENCO ---

router.get('/clients', asyncHandler(async (req, res) => {
  const clients = await prisma.client.findMany({
    where: { business: 'zenco' },
    orderBy: { createdAt: 'desc' }
  });
  res.json(clients);
}));

router.post('/clients', validate(createClientSchema), asyncHandler(async (req, res) => {
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
}));

router.put('/clients/:id', validate(updateClientSchema), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const data = req.body;
  const updated = await prisma.client.update({
    where: { id },
    data: {
      name: data.name,
      altPhone: data.altPhone,
      email: data.email,
      notes: data.notes,
    }
  });
  res.json(updated);
}));

// Z20: Delete client
router.delete('/clients/:id', asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  await prisma.client.delete({ where: { id } });
  res.json({ success: true });
}));

router.get('/clients/search', asyncHandler(async (req, res) => {
  const q = (req.query.q as string || '').trim();
  if (!q) {
    res.json([]);
    return;
  }
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
}));

// --- HISTORIAL DE ORDENES POR CLIENTE ---

router.get('/clients/:id/orders', asyncHandler(async (req, res, next) => {
  const id = req.params.id as string;
  const { status, from, to } = req.query as Record<string, string | undefined>;

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    return next(new NotFoundError('Cliente no encontrado'));
  }

  const where: any = {
    OR: [
      { clientPhone: client.phone },
      { clientName: { contains: client.name, mode: 'insensitive' } }
    ]
  };

  if (status) {
    where.status = status;
  }

  if (from || to) {
    const dateFilter: Record<string, string> = {};
    if (from) dateFilter.gte = from;
    if (to) dateFilter.lte = to;
    where.intakeDate = dateFilter;
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { intakeDate: 'desc' },
  });

  const garmentsByStatus: Record<string, number> = {};
  for (const order of orders) {
    garmentsByStatus[order.status] = (garmentsByStatus[order.status] || 0) + 1;
  }

  res.json({
    client,
    orders,
    summary: {
      totalOrders: orders.length,
      totalGarments: orders.length,
      garmentsByStatus,
    },
  });
}));

// --- REPORTS ---

// Helper: get week range (Mon–Sun) for a given date
function getWeekRange(date: Date): { start: string; end: string } {
  const day = date.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(date);
  mon.setDate(date.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().split('T')[0],
    end: sun.toISOString().split('T')[0],
  };
}

// Helper: get month range for a YYYY-MM string
function getMonthRange(yearMonth: string): { start: string; end: string } {
  const [year, month] = yearMonth.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // last day of month
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

type OrderRow = { id: string; orderNumber: number; status: string; repairType: string; price: number; intakeDate: string; deliveryDate: string; createdAt: Date; [key: string]: unknown };

// Helper: compute stats from an array of orders + newClients count
function computeOrderStats(orders: OrderRow[], newClients: number) {
  const totalOrders = orders.length;
  const totalGarments = orders.length;
  const garmentsDone = orders.filter(o => o.status === 'entregado' || o.status === 'listo').length;
  const revenue = orders.reduce((sum, o) => sum + (o.price || 0), 0);

  const garmentsByType: Record<string, number> = {};
  for (const o of orders) {
    if (o.repairType) {
      garmentsByType[o.repairType] = (garmentsByType[o.repairType] || 0) + 1;
    }
  }

  // Average turnaround: days between intakeDate and deliveryDate
  const turnarounds = orders
    .filter(o => o.intakeDate && o.deliveryDate)
    .map(o => {
      const intake = new Date(o.intakeDate).getTime();
      const delivery = new Date(o.deliveryDate).getTime();
      return (delivery - intake) / 86400000;
    })
    .filter(d => d >= 0);

  const avgTurnaroundDays = turnarounds.length > 0
    ? Math.round(turnarounds.reduce((s, d) => s + d, 0) / turnarounds.length)
    : 0;

  return { totalOrders, totalGarments, garmentsDone, revenue, newClients, garmentsByType, avgTurnaroundDays };
}

router.get('/reports/weekly', asyncHandler(async (req, res, next) => {
  let range: { start: string; end: string };

  if (req.query.date) {
    const d = new Date(req.query.date as string);
    if (isNaN(d.getTime())) {
        return next(new ValidationError('Fecha invalida. Usar formato YYYY-MM-DD'));
    }
    range = getWeekRange(d);
  } else {
    range = getWeekRange(new Date());
  }

  const startDt = new Date(range.start + 'T00:00:00.000Z');
  const endDt = new Date(range.end + 'T23:59:59.999Z');

  const [orders, newClients] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: startDt, lte: endDt } },
    }),
    prisma.client.count({
      where: { business: 'zenco', createdAt: { gte: startDt, lte: endDt } },
    }),
  ]);

  const stats = computeOrderStats(orders as OrderRow[], newClients);
  res.json({ period: range, ...stats });
}));

router.get('/reports/monthly', asyncHandler(async (req, res, next) => {
  let range: { start: string; end: string };

  if (req.query.month) {
    const m = req.query.month as string;
    if (!/^\d{4}-\d{2}$/.test(m)) {
      return next(new ValidationError('Mes invalido. Usar formato YYYY-MM'));
    }
    range = getMonthRange(m);
  } else {
    const now = new Date();
    const ym = now.toISOString().slice(0, 7);
    range = getMonthRange(ym);
  }

  const startDt = new Date(range.start + 'T00:00:00.000Z');
  const endDt = new Date(range.end + 'T23:59:59.999Z');

  const [orders, newClients] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: startDt, lte: endDt } },
    }),
    prisma.client.count({
      where: { business: 'zenco', createdAt: { gte: startDt, lte: endDt } },
    }),
  ]);

  const stats = computeOrderStats(orders as OrderRow[], newClients);
  res.json({ period: range, ...stats });
}));

router.get('/reports/summary', asyncHandler(async (req, res) => {
  const now = new Date();
  const ym = now.toISOString().slice(0, 7);
  const monthRange = getMonthRange(ym);
  const startDt = new Date(monthRange.start + 'T00:00:00.000Z');
  const endDt = new Date(monthRange.end + 'T23:59:59.999Z');

  const [allOrders, periodOrders, allTimeClients, periodClients] = await Promise.all([
    prisma.order.findMany({}),
    prisma.order.findMany({
      where: { createdAt: { gte: startDt, lte: endDt } },
    }),
    prisma.client.count({ where: { business: 'zenco' } }),
    prisma.client.count({
      where: { business: 'zenco', createdAt: { gte: startDt, lte: endDt } },
    }),
  ]);

  const allTimeStats = computeOrderStats(allOrders as OrderRow[], allTimeClients);
  const currentMonthStats = computeOrderStats(periodOrders as OrderRow[], periodClients);

  res.json({
    allTime: {
      totalOrders: allTimeStats.totalOrders,
      totalRevenue: allTimeStats.revenue,
      totalClients: allTimeClients,
      garmentsDone: allTimeStats.garmentsDone,
      garmentsByType: allTimeStats.garmentsByType,
      avgTurnaroundDays: allTimeStats.avgTurnaroundDays,
    },
    currentMonth: {
      period: monthRange,
      ...currentMonthStats,
    },
  });
}));

export { router as zencoRoutes };
