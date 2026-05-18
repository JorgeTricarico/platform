import { Router } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../db.js';
import { validate, createGarmentSchema, updateGarmentSchema, updateStatusSchema, createFinanceSchema, updateFinanceSchema, createClientSchema, updateClientSchema } from '../schemas.js';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { whatsappService } from '../services/whatsapp.js';
import { normalizeArgentinePhone } from '../utils/phone.js';
import { buildZencoReadyMsg } from '../lib/whatsapp-zenco-template.js';

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
    orderBy: { deliveryDate: 'asc' },
    include: { items: true },
  });
  res.json(garments);
}));

router.post('/garments', validate(createGarmentSchema), asyncHandler(async (req, res) => {
  const data = req.body;
  // Normalizar teléfono ANTES de upsert (garantiza unicidad por número canónico)
  const normalizedPhone = normalizeArgentinePhone(data.clientPhone).e164 ?? data.clientPhone;

  await prisma.client.upsert({
    where: { phone_business: { phone: normalizedPhone, business: 'zenco' } },
    update: { name: data.clientName },
    create: { name: data.clientName, phone: normalizedPhone, business: 'zenco' }
  });

  const newOrder = await prisma.order.create({
    data: {
      id: randomUUID(),
      clientName: data.clientName,
      clientPhone: normalizedPhone,
      status: data.status || 'recibido',
      intakeDate: data.intakeDate || new Date().toISOString().split('T')[0],
      deliveryDate: data.deliveryDate,
      deposit: Number(data.deposit || 0),
      location: data.location || null,
      items: {
        create: data.items.map((item: { garmentName: string; repairType: string; description: string; price: number }) => ({
          garmentName: item.garmentName,
          repairType: item.repairType,
          description: item.description || '',
          price: Number(item.price),
        })),
      },
    },
    include: { items: true },
  });

  if (newOrder.deposit > 0) {
    try {
      await prisma.zencoFinance.create({
        data: {
          id: `FIN-Z-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'income',
          category: 'seña_arreglo',
          amount: newOrder.deposit,
          description: `Seña: ${newOrder.clientName}`,
        },
      });
    } catch {}
  }

  res.json(newOrder);
}));

router.put('/garments/:id/status', validate(updateStatusSchema), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const { status } = req.body;
  const prev = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!prev) throw new NotFoundError('Orden no encontrada');

  if (prev.status === status) {
    res.json({
      unchanged: true,
      status,
      message: `La prenda ya estaba en estado "${status}". No se realizaron cambios.`,
      id: prev.id,
      orderNumber: prev.orderNumber,
    });
    return;
  }

  const totalPrice = prev.items.reduce((sum: number, item: { price: number }) => sum + item.price, 0);
  const statusChangedAt = new Date().toISOString();

  // Atomic guard: only transition if current status is NOT the target. Two concurrent
  // requests with the same target status: exactly one updates, the other gets count=0.
  const updateResult = await prisma.order.updateMany({
    where: { id, status: { not: status } },
    data: { status, statusChangedAt },
  });

  if (updateResult.count === 0) {
    // Race lost: another request transitioned this order first. Skip side effects.
    res.json({
      unchanged: true,
      status,
      message: `La prenda ya estaba en estado "${status}". No se realizaron cambios.`,
      id: prev.id,
      orderNumber: prev.orderNumber,
    });
    return;
  }

  const updated = { ...prev, status, statusChangedAt };

  let previousDeliveries = 0;
  let messageMode: 'long' | 'short' = 'long';

  if (status === 'listo') {
    previousDeliveries = await prisma.order.count({
      where: {
        clientPhone: updated.clientPhone,
        status: 'entregado',
        id: { not: prev.id },
      },
    });
    messageMode = previousDeliveries >= 2 ? 'short' : 'long';

    const client = await prisma.client.findFirst({
      where: { phone: updated.clientPhone, business: 'zenco' },
    });
    if (client) {
      await prisma.notification.create({
        data: {
          clientId: client.id,
          message: `Tu pedido #${updated.orderNumber} está listo para retirar.`,
          type: 'prenda_lista',
          read: false,
          audience: 'client',
        },
      });
    }

    if (process.env.WHATSAPP_ENABLED === 'true') {
      const itemNames = updated.items.map(i => i.garmentName);
      const msg = buildZencoReadyMsg(itemNames, { mode: messageMode });
      try {
        await whatsappService.sendMessage(updated.clientPhone, msg);
        console.log(`[WhatsApp] Notificación enviada a ${updated.clientPhone} — orden ${updated.orderNumber} (${messageMode})`);
      } catch (err) {
        console.warn(`[WhatsApp] Fallo al notificar orden ${updated.orderNumber}:`, err);
      }
    }
  }

  if (status === 'entregado') {
    const balance = totalPrice - prev.deposit;
    if (balance > 0) {
      const finId = `FIN-Z-STATUS-${updated.orderNumber}`;
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
            description: `Saldo orden #${updated.orderNumber} — ${updated.clientName}`,
          },
        });
      } catch {
        // Finance failure must not block status update
      }
    }
  }

  res.json({
    ...updated,
    ...(status === 'listo' ? { previousDeliveries, messageMode } : {}),
  });
}));

router.put('/garments/:id', validate(updateGarmentSchema), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const data = req.body;
  const prev = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!prev) throw new NotFoundError('Orden no encontrada');

  // Replace items atomically: delete all existing, create new ones in a single transaction
  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId: id } });
    await tx.orderItem.createMany({
      data: data.items.map((item: { garmentName: string; repairType: string; description: string; price: number }) => ({
        orderId: id,
        garmentName: item.garmentName,
        repairType: item.repairType,
        description: item.description || '',
        price: Number(item.price),
      })),
    });
  });

  const normalizedPhone = normalizeArgentinePhone(data.clientPhone).e164 ?? data.clientPhone;

  const updated = await prisma.order.update({
    where: { id },
    data: {
      clientName: data.clientName,
      clientPhone: normalizedPhone,
      status: data.status,
      intakeDate: data.intakeDate,
      deliveryDate: data.deliveryDate,
      deposit: Number(data.deposit || 0),
      location: data.location ?? undefined,
    },
    include: { items: true },
  });

  if (data.status === 'entregado' && prev.status !== 'entregado') {
    const totalPrice = updated.items.reduce((sum: number, item: { price: number }) => sum + item.price, 0);
    const balance = totalPrice - updated.deposit;
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
            description: `Saldo orden #${updated.orderNumber} — ${updated.clientName}`,
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

// IMPORTANTE: /clients/search debe estar ANTES de cualquier ruta con :id
// para evitar que Express capture "search" como un parámetro :id
router.get('/clients/search', asyncHandler(async (req, res) => {
  const q = (req.query.q as string || '').trim();
  if (!q) {
    res.json([]);
    return;
  }
  const orClauses: Array<Record<string, unknown>> = [
    { name: { contains: q, mode: 'insensitive' } },
    { phone: { contains: q } },
    { altPhone: { contains: q } },
  ];
  // Si q parece un teléfono, también buscar por la forma normalizada
  if (/^\+?[\d\s\-()]+$/.test(q)) {
    const normalized = normalizeArgentinePhone(q).e164;
    if (normalized && normalized !== q) {
      orClauses.push({ phone: { contains: normalized } });
      orClauses.push({ altPhone: { contains: normalized } });
    }
  }
  const clients = await prisma.client.findMany({
    where: {
      business: 'zenco',
      OR: orClauses,
    }
  });
  res.json(clients);
}));

router.post('/clients', validate(createClientSchema), asyncHandler(async (req, res) => {
  const data = req.body;
  const normalizedPhone = normalizeArgentinePhone(data.phone).e164!;
  const normalizedAlt = data.altPhone ? normalizeArgentinePhone(data.altPhone).e164 ?? data.altPhone : data.altPhone;
  // Upsert: si ya existe por telefono, actualizar
  const client = await prisma.client.upsert({
    where: { phone_business: { phone: normalizedPhone, business: 'zenco' } },
    update: { name: data.name, altPhone: normalizedAlt, email: data.email, notes: data.notes },
    create: {
      name: data.name,
      phone: normalizedPhone,
      altPhone: normalizedAlt,
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
  const updateData: Record<string, unknown> = {
    name: data.name,
    email: data.email,
    notes: data.notes,
  };

  if (data.phone !== undefined) {
    const normalized = normalizeArgentinePhone(data.phone).e164;
    if (!normalized) {
      throw new ValidationError('Teléfono inválido');
    }
    // Chequear duplicado (otro cliente con ese phone en zenco)
    const conflict = await prisma.client.findFirst({
      where: { phone: normalized, business: 'zenco', NOT: { id } },
    });
    if (conflict) {
      res.status(409).json({ error: 'Otro cliente ya usa ese teléfono', conflictWith: conflict.id });
      return;
    }
    updateData.phone = normalized;
  }

  if (data.altPhone !== undefined) {
    updateData.altPhone = data.altPhone
      ? normalizeArgentinePhone(data.altPhone).e164 ?? data.altPhone
      : data.altPhone;
  }

  const updated = await prisma.client.update({
    where: { id },
    data: updateData,
  });
  res.json(updated);
}));

// Z20: Delete client
router.delete('/clients/:id', asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  await prisma.client.delete({ where: { id } });
  res.json({ success: true });
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

type OrderItemRow = { garmentName: string; repairType: string; price: number };
type OrderRow = { id: string; orderNumber: number; status: string; intakeDate: string; deliveryDate: string; createdAt: Date; items?: OrderItemRow[]; [key: string]: unknown };

// Helper: compute stats from an array of orders + newClients count
function computeOrderStats(orders: OrderRow[], newClients: number) {
  const totalOrders = orders.length;
  const totalGarments = orders.reduce((sum, o) => sum + (o.items?.length ?? 0), 0);
  const garmentsDone = orders.filter(o => o.status === 'entregado' || o.status === 'listo').length;
  const revenue = orders.reduce((sum, o) => sum + (o.items ?? []).reduce((s, i) => s + (i.price || 0), 0), 0);

  const garmentsByType: Record<string, number> = {};
  for (const o of orders) {
    for (const item of (o.items ?? [])) {
      if (item.repairType) {
        garmentsByType[item.repairType] = (garmentsByType[item.repairType] || 0) + 1;
      }
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
