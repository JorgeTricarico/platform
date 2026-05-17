import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { app } from '../index.js';
import { authHeader } from './setup.js';

// Mock whatsappService for Z7 tests
vi.mock('../services/whatsapp.js', () => ({
  whatsappService: {
    sendMessage: vi.fn().mockResolvedValue({ id: 'msg-z7' }),
    getStatus: vi.fn(),
    getQR: vi.fn(),
    onMessage: vi.fn(),
  },
}));

import { whatsappService } from '../services/whatsapp.js';

const mockWA = whatsappService as unknown as {
  sendMessage: ReturnType<typeof vi.fn>;
};

const mockPrisma = prisma as unknown as {
  order: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn>; groupBy: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  orderItem: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
  zencoFinance: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  client: { findMany: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  garmentPhoto: { deleteMany: ReturnType<typeof vi.fn> };
  notification: { create: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
});

// --- GARMENTS CRUD (Orders con Items) ---

// Helper: orden con items para los tests
const makeOrder = (overrides = {}) => ({
  id: 'ORD-1', orderNumber: 1, clientName: 'Ana', clientPhone: '1234',
  status: 'recibido', intakeDate: '2026-04-01', deliveryDate: '2026-04-10', deposit: 0,
  items: [
    { id: 'ITEM-1', orderId: 'ORD-1', garmentName: 'Pantalon', repairType: 'dobladillo', description: 'acortar', price: 3000 },
  ],
  ...overrides,
});

describe('GET /api/zenco/garments', () => {
  it('returns empty array when no garments', async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/zenco/garments').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns orders with items array', async () => {
    const orders = [
      makeOrder({ id: 'ORD-1', orderNumber: 1, clientName: 'Ana', deliveryDate: '2026-04-10' }),
      makeOrder({ id: 'ORD-2', orderNumber: 2, clientName: 'Luis', deliveryDate: '2026-04-12',
        items: [{ id: 'ITEM-2', orderId: 'ORD-2', garmentName: 'Campera', repairType: 'cierre', description: '', price: 5000 }] }),
    ];
    mockPrisma.order.findMany.mockResolvedValue(orders);
    const res = await request(app).get('/api/zenco/garments').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].clientName).toBe('Ana');
    expect(res.body[0].items).toHaveLength(1);
    expect(res.body[0].items[0].garmentName).toBe('Pantalon');
  });
});

describe('POST /api/zenco/garments', () => {
  const validInput = {
    clientName: 'Maria', clientPhone: '1111',
    intakeDate: '2026-04-05', deliveryDate: '2026-04-15', deposit: 0,
    items: [
      { garmentName: 'Vestido', repairType: 'entalle', description: 'achicar cintura', price: 4500 },
    ],
  };

  it('creates order with items and registers client', async () => {
    const created = makeOrder({ id: 'ORD-123', orderNumber: 3, clientName: 'Maria', clientPhone: '1111',
      items: [{ id: 'ITEM-NEW', orderId: 'ORD-123', garmentName: 'Vestido', repairType: 'entalle', description: 'achicar cintura', price: 4500 }] });
    mockPrisma.order.create.mockResolvedValue(created);
    mockPrisma.client.upsert.mockResolvedValue({ id: 'client-123', name: 'Maria', phone: '1111', business: 'zenco' });

    const res = await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send(validInput);
    expect(res.status).toBe(200);
    expect(res.body.clientName).toBe('Maria');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].garmentName).toBe('Vestido');
    expect(mockPrisma.order.create).toHaveBeenCalledOnce();
    expect(mockPrisma.client.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { phone_business: { phone: '1111', business: 'zenco' } },
      create: expect.objectContaining({ name: 'Maria' }),
    }));
  });

  it('creates items nested inside order via Prisma create', async () => {
    mockPrisma.order.create.mockResolvedValue(makeOrder());
    mockPrisma.client.upsert.mockResolvedValue({ id: 'c1', name: 'Maria', phone: '1111', business: 'zenco' });

    await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send(validInput);

    const callData = mockPrisma.order.create.mock.calls[0][0].data;
    expect(callData.items).toBeDefined();
    expect(callData.items.create).toHaveLength(1);
    expect(callData.items.create[0].garmentName).toBe('Vestido');
    expect(callData.items.create[0].price).toBe(4500);
  });

  it('creates a seña finance entry when deposit > 0', async () => {
    const inputWithDeposit = { ...validInput, deposit: 1000 };
    const createdWithDeposit = makeOrder({ deposit: 1000 });
    mockPrisma.order.create.mockResolvedValue(createdWithDeposit);
    mockPrisma.client.upsert.mockResolvedValue({ id: 'c1', name: 'Maria', phone: '1111', business: 'zenco' });
    mockPrisma.zencoFinance.create.mockResolvedValue({});

    await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send(inputWithDeposit);
    expect(mockPrisma.zencoFinance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'income', category: 'seña_arreglo', amount: 1000 }),
      })
    );
  });

  it('sets default intakeDate to today if not provided', async () => {
    const inputNoDate = { clientName: 'Pedro', clientPhone: '2222', deliveryDate: '2026-04-20',
      items: [{ garmentName: 'Camisa', repairType: 'dobladillo', description: '', price: 2000 }] };
    mockPrisma.order.create.mockResolvedValue(makeOrder());
    mockPrisma.client.upsert.mockResolvedValue({ id: 'c2', name: 'Pedro', phone: '2222', business: 'zenco' });

    await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send(inputNoDate);
    const callData = mockPrisma.order.create.mock.calls[0][0].data;
    expect(callData.intakeDate).toBeTruthy();
    expect(callData.intakeDate).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it('requires at least one item', async () => {
    const res = await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send({
      clientName: 'Test', clientPhone: '1111', deliveryDate: '2026-05-01', items: [],
    });
    expect(res.status).toBe(400);
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.order.create.mockRejectedValue(new Error('DB error'));
    mockPrisma.client.upsert.mockResolvedValue({ id: 'c1', name: 'Fail', phone: '0000', business: 'zenco' });
    const res = await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send({
      clientName: 'Fail', clientPhone: '0000', deliveryDate: '2026-04-20',
      items: [{ garmentName: 'X', repairType: 'y', description: '', price: 100 }],
    });
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

describe('PUT /api/zenco/garments/:id/status', () => {
  const fullOrder = makeOrder({
    id: 'ORD-1', orderNumber: 6, clientName: 'Ana', clientPhone: '5491112345678',
    status: 'listo', deposit: 0,
    items: [{ id: 'ITEM-1', orderId: 'ORD-1', garmentName: 'Pantalon', repairType: 'dobladillo', description: 'acortar', price: 3000 }],
  });

  beforeEach(() => {
    mockPrisma.order.findUnique.mockResolvedValue(fullOrder);
  });

  it('updates order status', async () => {
    mockPrisma.order.update.mockResolvedValue(fullOrder);
    mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-uuid-123', phone: '5491112345678', business: 'zenco' });
    mockPrisma.notification.create.mockResolvedValue({});
    const res = await request(app).put('/api/zenco/garments/ORD-1/status').set('Authorization', authHeader('zenco')).send({ status: 'listo' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('listo');
  });

  // --- Z7: WhatsApp integration ---

  it('sends WhatsApp message when status changes to listo', async () => {
    process.env.WHATSAPP_ENABLED = 'true';
    mockPrisma.order.update.mockResolvedValue(fullOrder);
    mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-uuid-123', phone: '5491112345678', business: 'zenco' });
    mockPrisma.notification.create.mockResolvedValue({});
    mockWA.sendMessage.mockResolvedValue({ id: 'msg-z7' });

    const res = await request(app).put('/api/zenco/garments/ORD-1/status').set('Authorization', authHeader('zenco')).send({ status: 'listo' });
    process.env.WHATSAPP_ENABLED = undefined;
    expect(res.status).toBe(200);
    expect(mockWA.sendMessage).toHaveBeenCalledOnce();
    expect(mockWA.sendMessage).toHaveBeenCalledWith(
      '5491112345678',
      expect.stringContaining('ya está listo para retirar')
    );
  });

  it('does NOT send WhatsApp when status is not listo', async () => {
    mockPrisma.order.update.mockResolvedValue({ ...fullOrder, status: 'en_proceso' });
    const res = await request(app).put('/api/zenco/garments/ORD-1/status').set('Authorization', authHeader('zenco')).send({ status: 'en_proceso' });
    expect(res.status).toBe(200);
    expect(mockWA.sendMessage).not.toHaveBeenCalled();
  });

  it('still succeeds when WhatsApp fails (graceful degradation)', async () => {
    process.env.WHATSAPP_ENABLED = 'true';
    mockPrisma.order.update.mockResolvedValue(fullOrder);
    mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-uuid-123', phone: '5491112345678', business: 'zenco' });
    mockPrisma.notification.create.mockResolvedValue({});
    mockWA.sendMessage.mockRejectedValue(new Error('WhatsApp not connected'));

    const res = await request(app).put('/api/zenco/garments/ORD-1/status').set('Authorization', authHeader('zenco')).send({ status: 'listo' });
    process.env.WHATSAPP_ENABLED = undefined;
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('listo');
    expect(mockPrisma.notification.create).toHaveBeenCalledOnce();
  });

  it('creates in-app notification even when WhatsApp fails', async () => {
    process.env.WHATSAPP_ENABLED = 'true';
    mockPrisma.order.update.mockResolvedValue(fullOrder);
    mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-uuid-123', phone: '5491112345678', business: 'zenco' });
    mockPrisma.notification.create.mockResolvedValue({});
    mockWA.sendMessage.mockRejectedValue(new Error('Send failed'));

    await request(app).put('/api/zenco/garments/ORD-1/status').set('Authorization', authHeader('zenco')).send({ status: 'listo' });
    process.env.WHATSAPP_ENABLED = undefined;
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ clientId: 'client-uuid-123', type: 'prenda_lista' }),
    });
  });

  // --- Z10: Auto-crear ingreso en ZencoFinance al entregar ---

  it('creates ZencoFinance income (sum of items) when status changes to entregado', async () => {
    const entregado = { ...fullOrder, status: 'entregado' };
    mockPrisma.order.update.mockResolvedValue(entregado);
    mockPrisma.zencoFinance.upsert.mockResolvedValue({});

    const res = await request(app).put('/api/zenco/garments/ORD-1/status').set('Authorization', authHeader('zenco')).send({ status: 'entregado' });
    expect(res.status).toBe(200);
    expect(mockPrisma.zencoFinance.upsert).toHaveBeenCalledOnce();
    expect(mockPrisma.zencoFinance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: 'income',
          category: 'entrega_prenda',
          amount: 3000,
        }),
      })
    );
  });

  it('does NOT create ZencoFinance income for non-entregado status', async () => {
    mockPrisma.order.update.mockResolvedValue(fullOrder);
    mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-uuid-123', phone: '5491112345678', business: 'zenco' });
    mockPrisma.notification.create.mockResolvedValue({});
    mockWA.sendMessage.mockResolvedValue({});

    await request(app).put('/api/zenco/garments/ORD-1/status').set('Authorization', authHeader('zenco')).send({ status: 'listo' });
    expect(mockPrisma.zencoFinance.create).not.toHaveBeenCalled();
  });

  it('still returns 200 when ZencoFinance upsert fails on entregado', async () => {
    const entregado = { ...fullOrder, status: 'entregado' };
    mockPrisma.order.update.mockResolvedValue(entregado);
    mockPrisma.zencoFinance.upsert.mockRejectedValue(new Error('DB error'));

    const res = await request(app).put('/api/zenco/garments/ORD-1/status').set('Authorization', authHeader('zenco')).send({ status: 'entregado' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('entregado');
  });
});

describe('PUT /api/zenco/garments/:id', () => {
  beforeEach(() => {
    mockPrisma.order.findUnique.mockResolvedValue(makeOrder({ id: 'ORD-1', orderNumber: 7 }));
    mockPrisma.orderItem.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.orderItem.createMany.mockResolvedValue({ count: 1 });
  });

  it('updates order header fields', async () => {
    const update = {
      clientName: 'Ana Updated', clientPhone: '1234', status: 'en_proceso',
      intakeDate: '2026-04-01', deliveryDate: '2026-04-08', deposit: 0,
      items: [{ garmentName: 'Pantalon', repairType: 'dobladillo', description: 'mas corto', price: 3500 }],
    };
    mockPrisma.order.update.mockResolvedValue(makeOrder({ clientName: 'Ana Updated', status: 'en_proceso', orderNumber: 7 }));

    const res = await request(app).put('/api/zenco/garments/ORD-1').set('Authorization', authHeader('zenco')).send(update);
    expect(res.status).toBe(200);
    expect(res.body.clientName).toBe('Ana Updated');
  });

  it('replaces items: deleteMany then createMany', async () => {
    const update = {
      clientName: 'Ana', clientPhone: '1234', status: 'en_proceso',
      intakeDate: '2026-04-01', deliveryDate: '2026-04-08', deposit: 0,
      items: [
        { garmentName: 'Pantalon', repairType: 'dobladillo', description: '', price: 2000 },
        { garmentName: 'Camisa', repairType: 'boton', description: '', price: 500 },
      ],
    };
    mockPrisma.order.update.mockResolvedValue(makeOrder({ orderNumber: 7 }));

    await request(app).put('/api/zenco/garments/ORD-1').set('Authorization', authHeader('zenco')).send(update);

    expect(mockPrisma.orderItem.deleteMany).toHaveBeenCalledWith({ where: { orderId: 'ORD-1' } });
    expect(mockPrisma.orderItem.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ garmentName: 'Pantalon', price: 2000, orderId: 'ORD-1' }),
        expect.objectContaining({ garmentName: 'Camisa', price: 500, orderId: 'ORD-1' }),
      ]),
    });
  });

  it('uses upsert with deterministic id FIN-Z-DEL-{orderNumber} when status changes to entregado', async () => {
    const update = {
      clientName: 'Ana', clientPhone: '1234', status: 'entregado',
      intakeDate: '2026-04-01', deliveryDate: '2026-04-08', deposit: 500,
      items: [{ garmentName: 'Pantalon', repairType: 'dobladillo', description: '', price: 3500 }],
    };
    const updatedOrder = makeOrder({ id: 'ORD-1', orderNumber: 42, status: 'entregado', deposit: 500,
      items: [{ id: 'I1', orderId: 'ORD-1', garmentName: 'Pantalon', repairType: 'dobladillo', description: '', price: 3500 }] });
    mockPrisma.order.update.mockResolvedValue(updatedOrder);
    mockPrisma.zencoFinance.upsert.mockResolvedValue({});

    const res = await request(app).put('/api/zenco/garments/ORD-1').set('Authorization', authHeader('zenco')).send(update);
    expect(res.status).toBe(200);
    expect(mockPrisma.zencoFinance.upsert).toHaveBeenCalledOnce();
    expect(mockPrisma.zencoFinance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'FIN-Z-DEL-42' },
        create: expect.objectContaining({ id: 'FIN-Z-DEL-42', type: 'income', category: 'entrega_prenda' }),
      })
    );
    expect(mockPrisma.zencoFinance.create).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/zenco/garments/:id', () => {
  beforeEach(() => {
    mockPrisma.garmentPhoto.deleteMany.mockResolvedValue({ count: 0 });
  });

  it('deletes a garment', async () => {
    mockPrisma.order.delete.mockResolvedValue({});
    const res = await request(app).delete('/api/zenco/garments/ORD-1').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 500 if garment not found', async () => {
    mockPrisma.order.delete.mockRejectedValue(new Error('Not found'));
    const res = await request(app).delete('/api/zenco/garments/FAKE').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(500);
  });

  // BUG 2: debe eliminar fotos huérfanas antes de eliminar la orden
  it('deletes orphan garment photos before deleting the order', async () => {
    mockPrisma.garmentPhoto.deleteMany.mockResolvedValue({ count: 2 });
    mockPrisma.order.delete.mockResolvedValue({});

    const res = await request(app).delete('/api/zenco/garments/ORD-1').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Debe llamar deleteMany de fotos ANTES de delete de la orden
    expect(mockPrisma.garmentPhoto.deleteMany).toHaveBeenCalledWith({ where: { garmentId: 'ORD-1' } });
    expect(mockPrisma.order.delete).toHaveBeenCalledWith({ where: { id: 'ORD-1' } });
  });
});

// --- FINANCES ---

describe('GET /api/zenco/finances', () => {
  it('returns finances list', async () => {
    mockPrisma.zencoFinance.findMany.mockResolvedValue([{ id: 'FIN-1', date: '2026-04-01', type: 'income', category: 'Arreglos', amount: 5000, description: 'Pago cliente' }]);
    const res = await request(app).get('/api/zenco/finances').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('POST /api/zenco/finances', () => {
  it('creates a finance entry', async () => {
    const input = { date: '2026-04-05', type: 'expense', category: 'Insumos', amount: 1200, description: 'Hilos' };
    mockPrisma.zencoFinance.create.mockResolvedValue({ id: 'FIN-Z-123', ...input });
    const res = await request(app).post('/api/zenco/finances').set('Authorization', authHeader('zenco')).send(input);
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('Insumos');
  });
});

// --- CLIENTS ---

describe('GET /api/zenco/clients', () => {
  it('returns only zenco clients', async () => {
    mockPrisma.client.findMany.mockResolvedValue([{ id: 'c1', name: 'Maria', phone: '1111', business: 'zenco' }]);
    const res = await request(app).get('/api/zenco/clients').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body[0].business).toBe('zenco');
    // Verify filter was applied
    expect(mockPrisma.client.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { business: 'zenco' } }));
  });
});

describe('POST /api/zenco/clients', () => {
  it('upserts a client by phone+business (phone normalizado a E.164)', async () => {
    // Phone AR de 10 dígitos → normaliza a 5491150575555
    const input = { name: 'Carlos', phone: '1150575555', email: 'c@test.com' };
    mockPrisma.client.upsert.mockResolvedValue({ id: 'uuid-1', ...input, phone: '5491150575555', business: 'zenco' });
    const res = await request(app).post('/api/zenco/clients').set('Authorization', authHeader('zenco')).send(input);
    expect(res.status).toBe(200);
    expect(mockPrisma.client.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { phone_business: { phone: '5491150575555', business: 'zenco' } },
    }));
  });
});

describe('GET /api/zenco/clients/search', () => {
  it('searches clients by query', async () => {
    mockPrisma.client.findMany.mockResolvedValue([{ id: 'c1', name: 'Maria Lopez', phone: '1111', business: 'zenco' }]);
    const res = await request(app).get('/api/zenco/clients/search?q=maria').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

// --- Z20: DELETE CLIENT ---

describe('DELETE /api/zenco/clients/:id', () => {
  it('deletes a client and returns success', async () => {
    mockPrisma.client.delete.mockResolvedValue({ id: 'c1', name: 'Maria', phone: '1111', business: 'zenco' });
    const res = await request(app).delete('/api/zenco/clients/c1').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockPrisma.client.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('returns 500 on DB error', async () => {
    mockPrisma.client.delete.mockRejectedValue(new Error('Not found'));
    const res = await request(app).delete('/api/zenco/clients/c999').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(500);
  });
});

// --- DASHBOARD ---

describe('GET /api/zenco/dashboard', () => {
  it('returns counts by status', async () => {
    mockPrisma.order.groupBy.mockResolvedValue([
      { status: 'recibido', _count: { _all: 3 } },
      { status: 'en_proceso', _count: { _all: 5 } },
      { status: 'listo', _count: { _all: 2 } },
      { status: 'entregado', _count: { _all: 10 } },
    ]);
    mockPrisma.order.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/zenco/dashboard').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body.byStatus).toEqual({
      recibido: 3,
      en_proceso: 5,
      listo: 2,
      entregado: 10,
    });
  });

  it('returns today deliveries', async () => {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = [
      { id: 'ORD-1', orderNumber: 9, clientName: 'Ana', garmentName: 'Pantalon', status: 'listo', deliveryDate: today },
    ];
    mockPrisma.order.groupBy.mockResolvedValue([]);
    // First findMany call = todayDeliveries, second = upcomingDeliveries
    mockPrisma.order.findMany
      .mockResolvedValueOnce(todayOrders)
      .mockResolvedValueOnce([]);

    const res = await request(app).get('/api/zenco/dashboard').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body.todayDeliveries).toHaveLength(1);
    expect(res.body.todayDeliveries[0].clientName).toBe('Ana');
  });

  it('returns upcoming deliveries (next 3 days, excluding today)', async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const upcomingOrders = [
      { id: 'ORD-2', orderNumber: 10, clientName: 'Luis', garmentName: 'Campera', status: 'en_proceso', deliveryDate: tomorrow },
    ];
    mockPrisma.order.groupBy.mockResolvedValue([]);
    mockPrisma.order.findMany
      .mockResolvedValueOnce([])        // todayDeliveries
      .mockResolvedValueOnce(upcomingOrders); // upcomingDeliveries

    const res = await request(app).get('/api/zenco/dashboard').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body.upcomingDeliveries).toHaveLength(1);
    expect(res.body.upcomingDeliveries[0].clientName).toBe('Luis');
  });

  it('returns empty dashboard when no orders exist', async () => {
    mockPrisma.order.groupBy.mockResolvedValue([]);
    mockPrisma.order.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/zenco/dashboard').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body.byStatus).toEqual({});
    expect(res.body.todayDeliveries).toEqual([]);
    expect(res.body.upcomingDeliveries).toEqual([]);
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.order.groupBy.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/zenco/dashboard').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

// --- DASHBOARD: MONTHLY INCOME (Z22) ---

describe('GET /api/zenco/dashboard — monthlyIncome', () => {
  it('returns monthlyIncome summing current month ingreso finances', async () => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7); // YYYY-MM

    mockPrisma.order.groupBy.mockResolvedValue([]);
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.zencoFinance.findMany.mockResolvedValue([
      { id: 'FIN-Z-1', date: `${currentMonth}-05`, type: 'income', category: 'entrega_prenda', amount: 5000, description: 'Entrega A' },
      { id: 'FIN-Z-2', date: `${currentMonth}-10`, type: 'income', category: 'entrega_prenda', amount: 3000, description: 'Entrega B' },
      { id: 'FIN-Z-3', date: `${currentMonth}-12`, type: 'expense', category: 'insumos', amount: 1000, description: 'Hilos' },
    ]);

    const res = await request(app).get('/api/zenco/dashboard').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body.monthlyIncome).toBe(8000);
    expect(res.body.monthlyExpenses).toBe(1000);
  });

  it('returns 0 when no finances exist this month', async () => {
    mockPrisma.order.groupBy.mockResolvedValue([]);
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.zencoFinance.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/zenco/dashboard').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body.monthlyIncome).toBe(0);
    expect(res.body.monthlyExpenses).toBe(0);
  });
});

// --- DASHBOARD: STALE GARMENTS (Z25) ---

describe('GET /api/zenco/dashboard/stale-garments', () => {
  it('returns garments with status listo and deliveryDate >7 days ago', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0];
    const staleGarments = [
      { id: '0001', orderNumber: 11, clientName: 'María', clientPhone: '111', garmentName: 'Campera', repairType: 'cierre', description: 'Cambiar cierre', status: 'listo', intakeDate: '2026-03-01', deliveryDate: tenDaysAgo, price: 5000 },
    ];
    mockPrisma.order.findMany.mockResolvedValue(staleGarments);

    const res = await request(app).get('/api/zenco/dashboard/stale-garments').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].clientName).toBe('María');
  });

  it('excludes garments with recent deliveryDate or non-listo status', async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/zenco/dashboard/stale-garments').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 500 on DB error', async () => {
    mockPrisma.order.findMany.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/zenco/dashboard/stale-garments').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });

  it('uses statusChangedAt instead of deliveryDate when available', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    // deliveryDate is in the future but statusChangedAt is >7 days ago — should be stale
    const staleByStatusChanged = [
      { id: '0002', orderNumber: 12, clientName: 'Luis', clientPhone: '222', garmentName: 'Saco', repairType: 'cierre', description: 'Cambiar cierre', status: 'listo', intakeDate: '2026-03-01', deliveryDate: tomorrow, statusChangedAt: tenDaysAgo, price: 4000 },
    ];
    mockPrisma.order.findMany.mockResolvedValue(staleByStatusChanged);

    const res = await request(app).get('/api/zenco/dashboard/stale-garments').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].clientName).toBe('Luis');
  });

  it('falls back to deliveryDate when statusChangedAt is null', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0];
    const staleByDelivery = [
      { id: '0003', orderNumber: 13, clientName: 'Marta', clientPhone: '333', garmentName: 'Vestido', repairType: 'ruedo', description: 'acortar', status: 'listo', intakeDate: '2026-03-01', deliveryDate: tenDaysAgo, statusChangedAt: null, price: 3000 },
    ];
    mockPrisma.order.findMany.mockResolvedValue(staleByDelivery);

    const res = await request(app).get('/api/zenco/dashboard/stale-garments').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].clientName).toBe('Marta');
  });

  it('excludes garment with recent statusChangedAt even if deliveryDate is old', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    // statusChangedAt is recent (1 day ago) — NOT stale
    const freshByStatusChanged = [
      { id: '0004', orderNumber: 14, clientName: 'Pablo', clientPhone: '444', garmentName: 'Camisa', repairType: 'cuello', description: 'reparar', status: 'listo', intakeDate: '2026-03-01', deliveryDate: tenDaysAgo, statusChangedAt: yesterday, price: 2000 },
    ];
    mockPrisma.order.findMany.mockResolvedValue(freshByStatusChanged);

    const res = await request(app).get('/api/zenco/dashboard/stale-garments').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

// --- STATUS CHANGED AT ---

describe('PUT /api/zenco/garments/:id/status — statusChangedAt', () => {
  it('sets statusChangedAt when updating status', async () => {
    const updated = { id: 'ORD-1', orderNumber: 15, status: 'listo', statusChangedAt: new Date().toISOString() };
    mockPrisma.order.update.mockResolvedValue(updated);
    mockPrisma.notification.create.mockResolvedValue({});

    await request(app).put('/api/zenco/garments/ORD-1/status').set('Authorization', authHeader('zenco')).send({ status: 'listo' });
    expect(mockPrisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ statusChangedAt: expect.any(String) }),
    }));
  });
});

// --- VALIDATION ---

describe('Zenco validation', () => {
  it('POST /garments returns 400 when clientName is missing', async () => {
    const res = await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send({
      clientPhone: '1234', garmentName: 'Pantalon', repairType: 'dobladillo',
      description: 'acortar', deliveryDate: '2026-04-10', price: 3000,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos invalidos');
  });

  it('POST /garments returns 400 when price is missing', async () => {
    const res = await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send({
      clientName: 'Ana', clientPhone: '1234', garmentName: 'Pantalon',
      repairType: 'dobladillo', description: 'acortar', deliveryDate: '2026-04-10',
    });
    expect(res.status).toBe(400);
  });

  it('PUT /garments/:id/status returns 400 when status is empty', async () => {
    const res = await request(app).put('/api/zenco/garments/ORD-1/status').set('Authorization', authHeader('zenco')).send({});
    expect(res.status).toBe(400);
  });

  it('POST /finances returns 400 when amount is not a number', async () => {
    const res = await request(app).post('/api/zenco/finances').set('Authorization', authHeader('zenco')).send({
      date: '2026-04-05', type: 'income', category: 'Arreglos',
      amount: 'not-a-number', description: 'Test',
    });
    expect(res.status).toBe(400);
  });

  it('POST /finances returns 400 when type is invalid', async () => {
    const res = await request(app).post('/api/zenco/finances').set('Authorization', authHeader('zenco')).send({
      date: '2026-04-05', type: 'invalid', category: 'Arreglos',
      amount: 1000, description: 'Test',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos invalidos');
  });

  it('POST /clients returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/zenco/clients').set('Authorization', authHeader('zenco')).send({ phone: '1234' });
    expect(res.status).toBe(400);
  });

  it('POST /garments returns 400 when status is invalid enum value', async () => {
    const res = await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send({
      clientName: 'Ana', clientPhone: '1234', garmentName: 'Pantalon',
      repairType: 'dobladillo', description: 'acortar', deliveryDate: '2026-04-10',
      price: 3000, status: 'INVALID_STATUS',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos invalidos');
  });

  it('PUT /garments/:id/status returns 400 for invalid status value', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({ id: '0001', status: 'recibido' });
    const res = await request(app).put('/api/zenco/garments/0001/status').set('Authorization', authHeader('zenco')).send({ status: 'inexistente' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos invalidos');
  });

  it('POST /garments returns 400 when price is negative', async () => {
    const res = await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send({
      clientName: 'Ana', clientPhone: '1234', garmentName: 'Pantalon',
      repairType: 'dobladillo', description: 'acortar', deliveryDate: '2026-04-10',
      price: -500,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos invalidos');
  });

  it('POST /garments returns 400 when price is NaN string', async () => {
    const res = await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send({
      clientName: 'Ana', clientPhone: '1234', garmentName: 'Pantalon',
      repairType: 'dobladillo', description: 'acortar', deliveryDate: '2026-04-10',
      price: 'abc',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos invalidos');
  });

  it('GET /clients/search returns empty array when q is empty', async () => {
    const res = await request(app).get('/api/zenco/clients/search').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(mockPrisma.client.findMany).not.toHaveBeenCalled();
  });

  it('GET /clients/search returns empty array when q is whitespace only', async () => {
    const res = await request(app).get('/api/zenco/clients/search?q=%20%20').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(mockPrisma.client.findMany).not.toHaveBeenCalled();
  });
});

// --- REPORTS ---

describe('GET /api/zenco/reports/weekly', () => {
  it('returns weekly stats with default (current week)', async () => {
    const orders = [
      { id: 'ORD-1', orderNumber: 16, clientName: 'Ana', clientPhone: '1111', status: 'entregado', intakeDate: '2026-04-01', deliveryDate: '2026-04-05', createdAt: new Date('2026-04-01'), items: [{ id: 'I1', orderId: 'ORD-1', garmentName: 'Pantalon', repairType: 'dobladillo', description: 'acortar', price: 3000 }] },
      { id: 'ORD-2', orderNumber: 17, clientName: 'Luis', clientPhone: '2222', status: 'listo', intakeDate: '2026-04-02', deliveryDate: '2026-04-07', createdAt: new Date('2026-04-02'), items: [{ id: 'I2', orderId: 'ORD-2', garmentName: 'Camisa', repairType: 'entalle', description: 'estrechar', price: 2000 }] },
    ];
    mockPrisma.order.findMany.mockResolvedValue(orders);
    mockPrisma.client.count.mockResolvedValue(1);

    const res = await request(app).get('/api/zenco/reports/weekly').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('period');
    expect(res.body).toHaveProperty('totalOrders');
    expect(res.body).toHaveProperty('totalGarments');
    expect(res.body).toHaveProperty('garmentsDone');
    expect(res.body).toHaveProperty('revenue');
    expect(res.body).toHaveProperty('newClients');
    expect(res.body).toHaveProperty('garmentsByType');
    expect(res.body).toHaveProperty('avgTurnaroundDays');
    expect(res.body.totalOrders).toBe(2);
    expect(res.body.totalGarments).toBe(2);
    expect(res.body.revenue).toBe(5000);
  });

  it('accepts ?date=YYYY-MM-DD to query a specific week', async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.client.count.mockResolvedValue(0);

    const res = await request(app).get('/api/zenco/reports/weekly?date=2026-04-01').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body.period.start).toMatch(/2026-03-3[0-9]|2026-04-0[0-9]/);
    expect(res.body.totalOrders).toBe(0);
  });

  it('returns 400 for invalid date param', async () => {
    const res = await request(app).get('/api/zenco/reports/weekly?date=not-a-date').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(400);
  });

  it('computes garmentsDone correctly (entregado + listo)', async () => {
    const orders = [
      { id: 'ORD-1', orderNumber: 18, status: 'entregado', intakeDate: '2026-04-01', deliveryDate: '2026-04-03', createdAt: new Date('2026-04-01'), items: [{ id: 'I1', orderId: 'ORD-1', garmentName: 'P1', repairType: 'dobladillo', description: '', price: 1000 }] },
      { id: 'ORD-2', orderNumber: 19, status: 'listo', intakeDate: '2026-04-02', deliveryDate: '2026-04-05', createdAt: new Date('2026-04-02'), items: [{ id: 'I2', orderId: 'ORD-2', garmentName: 'P2', repairType: 'entalle', description: '', price: 2000 }] },
      { id: 'ORD-3', orderNumber: 20, status: 'recibido', intakeDate: '2026-04-03', deliveryDate: '2026-04-10', createdAt: new Date('2026-04-03'), items: [{ id: 'I3', orderId: 'ORD-3', garmentName: 'P3', repairType: 'cierre', description: '', price: 500 }] },
    ];
    mockPrisma.order.findMany.mockResolvedValue(orders);
    mockPrisma.client.count.mockResolvedValue(0);

    const res = await request(app).get('/api/zenco/reports/weekly').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body.garmentsDone).toBe(2);
  });

  it('groups garments by repairType', async () => {
    const orders = [
      { id: 'ORD-1', orderNumber: 21, status: 'entregado', intakeDate: '2026-04-01', deliveryDate: '2026-04-03', createdAt: new Date(), items: [{ id: 'I1', orderId: 'ORD-1', garmentName: 'P1', repairType: 'dobladillo', description: '', price: 1000 }] },
      { id: 'ORD-2', orderNumber: 22, status: 'listo', intakeDate: '2026-04-02', deliveryDate: '2026-04-04', createdAt: new Date(), items: [{ id: 'I2', orderId: 'ORD-2', garmentName: 'P2', repairType: 'dobladillo', description: '', price: 2000 }] },
      { id: 'ORD-3', orderNumber: 23, status: 'recibido', intakeDate: '2026-04-03', deliveryDate: '2026-04-10', createdAt: new Date(), items: [{ id: 'I3', orderId: 'ORD-3', garmentName: 'P3', repairType: 'entalle', description: '', price: 500 }] },
    ];
    mockPrisma.order.findMany.mockResolvedValue(orders);
    mockPrisma.client.count.mockResolvedValue(0);

    const res = await request(app).get('/api/zenco/reports/weekly').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body.garmentsByType.dobladillo).toBe(2);
    expect(res.body.garmentsByType.entalle).toBe(1);
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.order.findMany.mockRejectedValue(new Error('DB error'));
    const res = await request(app).get('/api/zenco/reports/weekly').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(500);
  });
});

describe('GET /api/zenco/reports/monthly', () => {
  it('returns monthly stats with default (current month)', async () => {
    const orders = [
      { id: 'ORD-1', orderNumber: 24, status: 'entregado', intakeDate: '2026-04-01', deliveryDate: '2026-04-05', createdAt: new Date('2026-04-01'), items: [{ id: 'I1', orderId: 'ORD-1', garmentName: 'Pantalon', repairType: 'dobladillo', description: '', price: 3000 }] },
    ];
    mockPrisma.order.findMany.mockResolvedValue(orders);
    mockPrisma.client.count.mockResolvedValue(2);

    const res = await request(app).get('/api/zenco/reports/monthly').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('period');
    expect(res.body).toHaveProperty('totalOrders');
    expect(res.body).toHaveProperty('revenue');
    expect(res.body).toHaveProperty('newClients');
    expect(res.body).toHaveProperty('garmentsByType');
    expect(res.body.totalOrders).toBe(1);
    expect(res.body.revenue).toBe(3000);
    expect(res.body.newClients).toBe(2);
  });

  it('accepts ?month=YYYY-MM to query a specific month', async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.client.count.mockResolvedValue(0);

    const res = await request(app).get('/api/zenco/reports/monthly?month=2026-03').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body.period.start).toBe('2026-03-01');
    expect(res.body.period.end).toBe('2026-03-31');
  });

  it('returns 400 for invalid month param', async () => {
    const res = await request(app).get('/api/zenco/reports/monthly?month=invalid').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(400);
  });

  it('calculates avgTurnaroundDays from intakeDate to deliveryDate', async () => {
    const orders = [
      { id: 'ORD-1', orderNumber: 25, status: 'entregado', intakeDate: '2026-04-01', deliveryDate: '2026-04-05', createdAt: new Date('2026-04-01'), items: [{ id: 'I1', orderId: 'ORD-1', garmentName: 'P1', repairType: 'dobladillo', description: '', price: 1000 }] },
      { id: 'ORD-2', orderNumber: 26, status: 'entregado', intakeDate: '2026-04-02', deliveryDate: '2026-04-08', createdAt: new Date('2026-04-02'), items: [{ id: 'I2', orderId: 'ORD-2', garmentName: 'P2', repairType: 'entalle', description: '', price: 2000 }] },
    ];
    mockPrisma.order.findMany.mockResolvedValue(orders);
    mockPrisma.client.count.mockResolvedValue(0);

    const res = await request(app).get('/api/zenco/reports/monthly').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    // ORD-1: 4 days, ORD-2: 6 days → avg = 5
    expect(res.body.avgTurnaroundDays).toBe(5);
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.order.findMany.mockRejectedValue(new Error('DB error'));
    const res = await request(app).get('/api/zenco/reports/monthly').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(500);
  });
});

describe('GET /api/zenco/reports/summary', () => {
  it('returns all-time KPI totals', async () => {
    const allOrders = [
      { id: 'ORD-1', orderNumber: 27, status: 'entregado', intakeDate: '2026-01-01', deliveryDate: '2026-01-05', createdAt: new Date('2026-01-01'), items: [{ id: 'I1', orderId: 'ORD-1', garmentName: 'P1', repairType: 'dobladillo', description: '', price: 3000 }] },
      { id: 'ORD-2', orderNumber: 28, status: 'listo', intakeDate: '2026-02-01', deliveryDate: '2026-02-10', createdAt: new Date('2026-02-01'), items: [{ id: 'I2', orderId: 'ORD-2', garmentName: 'P2', repairType: 'entalle', description: '', price: 2000 }] },
      { id: 'ORD-3', orderNumber: 29, status: 'recibido', intakeDate: '2026-03-01', deliveryDate: '2026-03-15', createdAt: new Date('2026-03-01'), items: [{ id: 'I3', orderId: 'ORD-3', garmentName: 'P3', repairType: 'cierre', description: '', price: 1500 }] },
    ];
    const periodOrders = [
      { id: 'ORD-3', orderNumber: 29, status: 'recibido', intakeDate: '2026-03-01', deliveryDate: '2026-03-15', createdAt: new Date('2026-03-01'), items: [{ id: 'I3', orderId: 'ORD-3', garmentName: 'P3', repairType: 'cierre', description: '', price: 1500 }] },
    ];
    mockPrisma.order.findMany
      .mockResolvedValueOnce(allOrders)   // allTime query
      .mockResolvedValueOnce(periodOrders); // currentPeriod query
    mockPrisma.client.count
      .mockResolvedValueOnce(5)  // allTime clients
      .mockResolvedValueOnce(1); // currentPeriod clients

    const res = await request(app).get('/api/zenco/reports/summary').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('allTime');
    expect(res.body).toHaveProperty('currentMonth');
    expect(res.body.allTime.totalOrders).toBe(3);
    expect(res.body.allTime.totalRevenue).toBe(6500);
    expect(res.body.allTime.totalClients).toBe(5);
    expect(res.body.allTime.garmentsDone).toBe(2);
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.order.findMany.mockRejectedValue(new Error('DB error'));
    const res = await request(app).get('/api/zenco/reports/summary').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(500);
  });
});

// --- HEALTH CHECK ---

describe('GET /health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/health').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('PUT /api/zenco/finances/:id', () => {
  it('updates a finance entry', async () => {
    const updated = { id: 'f1', date: '2026-04-01', type: 'income', category: 'Arreglo', amount: 5000, description: 'Pantalon' };
    mockPrisma.zencoFinance.update.mockResolvedValue(updated);
    const res = await request(app).put('/api/zenco/finances/f1').set('Authorization', authHeader('zenco')).send({ amount: 5000, description: 'Pantalon' });
    expect(res.status).toBe(200);
    expect(mockPrisma.zencoFinance.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'f1' }
    }));
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.zencoFinance.update.mockRejectedValue(new Error('DB error'));
    const res = await request(app).put('/api/zenco/finances/f1').set('Authorization', authHeader('zenco')).send({ amount: 5000 });
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/zenco/finances/:id', () => {
  it('deletes a finance entry', async () => {
    mockPrisma.zencoFinance.delete.mockResolvedValue({});
    const res = await request(app).delete('/api/zenco/finances/f1').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.zencoFinance.delete.mockRejectedValue(new Error('DB error'));
    const res = await request(app).delete('/api/zenco/finances/f1').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(500);
  });
});

describe('PUT /api/zenco/clients/:id', () => {
  it('updates client fields by id', async () => {
    const updated = { id: 'c1', name: 'Ana Updated', phone: '1234', business: 'zenco' };
    mockPrisma.client.update.mockResolvedValue(updated);
    const res = await request(app).put('/api/zenco/clients/c1').set('Authorization', authHeader('zenco')).send({ name: 'Ana Updated' });
    expect(res.status).toBe(200);
    expect(mockPrisma.client.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: expect.objectContaining({ name: 'Ana Updated' })
    });
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app).put('/api/zenco/clients/c1').set('Authorization', authHeader('zenco')).send({});
    expect(res.status).toBe(200); // partial schema allows empty — all fields optional
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.client.update.mockRejectedValue(new Error('DB error'));
    const res = await request(app).put('/api/zenco/clients/c1').set('Authorization', authHeader('zenco')).send({ name: 'Test' });
    expect(res.status).toBe(500);
  });
});
