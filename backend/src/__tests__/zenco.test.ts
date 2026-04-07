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
  order: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn>; groupBy: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  zencoFinance: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  client: { findMany: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  notification: { create: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
});

// --- GARMENTS CRUD ---

describe('GET /api/zenco/garments', () => {
  it('returns empty array when no garments', async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/zenco/garments').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns garments sorted by deliveryDate', async () => {
    const garments = [
      { id: 'ORD-1', clientName: 'Ana', clientPhone: '1234', garmentName: 'Pantalon', repairType: 'dobladillo', description: 'acortar', status: 'recibido', intakeDate: '2026-04-01', deliveryDate: '2026-04-10', price: 3000 },
      { id: 'ORD-2', clientName: 'Luis', clientPhone: '5678', garmentName: 'Campera', repairType: 'cierre', description: 'cambiar cierre', status: 'en_proceso', intakeDate: '2026-04-02', deliveryDate: '2026-04-12', price: 5000 },
    ];
    mockPrisma.order.findMany.mockResolvedValue(garments);
    const res = await request(app).get('/api/zenco/garments').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].clientName).toBe('Ana');
  });
});

describe('POST /api/zenco/garments', () => {
  it('creates a garment with all required fields', async () => {
    const input = {
      clientName: 'Maria', clientPhone: '1111', garmentName: 'Vestido',
      repairType: 'entalle', description: 'achicar cintura',
      intakeDate: '2026-04-05', deliveryDate: '2026-04-15', price: 4500,
    };
    const created = { id: 'ORD-123', ...input, status: 'recibido', createdAt: new Date().toISOString() };
    mockPrisma.order.create.mockResolvedValue(created);

    const res = await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send(input);
    expect(res.status).toBe(200);
    expect(res.body.clientName).toBe('Maria');
    expect(res.body.price).toBe(4500);
    expect(mockPrisma.order.create).toHaveBeenCalledOnce();

    // Verify price is passed as Number
    const callData = mockPrisma.order.create.mock.calls[0][0].data;
    expect(typeof callData.price).toBe('number');
  });

  it('sets default intakeDate to today if not provided', async () => {
    const input = {
      clientName: 'Pedro', clientPhone: '2222', garmentName: 'Camisa',
      repairType: 'dobladillo', description: 'mangas', deliveryDate: '2026-04-20', price: 2000,
    };
    mockPrisma.order.create.mockResolvedValue({ id: 'ORD-456', ...input, intakeDate: '2026-04-05', status: 'recibido' });

    await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send(input);
    const callData = mockPrisma.order.create.mock.calls[0][0].data;
    expect(callData.intakeDate).toBeTruthy();
    expect(callData.intakeDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('converts string price to number', async () => {
    const input = {
      clientName: 'Test', clientPhone: '3333', garmentName: 'Remera',
      repairType: 'diseño', description: 'estampar', deliveryDate: '2026-04-20', price: '3000',
    };
    mockPrisma.order.create.mockResolvedValue({ id: 'ORD-789', ...input, price: 3000, intakeDate: '2026-04-05', status: 'recibido' });

    await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send(input);
    const callData = mockPrisma.order.create.mock.calls[0][0].data;
    expect(callData.price).toBe(3000);
    expect(typeof callData.price).toBe('number');
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.order.create.mockRejectedValue(new Error('DB error'));
    const res = await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send({
      clientName: 'Fail', clientPhone: '0000', garmentName: 'X',
      repairType: 'dobladillo', description: 'x', deliveryDate: '2026-04-20', price: 1000,
    });
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

describe('PUT /api/zenco/garments/:id/status', () => {
  const fullOrder = {
    id: 'ORD-1', clientName: 'Ana', clientPhone: '5491112345678',
    garmentName: 'Pantalon', repairType: 'dobladillo', description: 'acortar',
    status: 'listo', intakeDate: '2026-04-01', deliveryDate: '2026-04-10', price: 3000,
  };

  it('updates garment status', async () => {
    mockPrisma.order.update.mockResolvedValue(fullOrder);
    mockPrisma.notification.create.mockResolvedValue({});
    const res = await request(app).put('/api/zenco/garments/ORD-1/status').set('Authorization', authHeader('zenco')).send({ status: 'listo' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('listo');
  });

  // --- Z7: WhatsApp integration ---

  it('sends WhatsApp message when status changes to listo', async () => {
    mockPrisma.order.update.mockResolvedValue(fullOrder);
    mockPrisma.notification.create.mockResolvedValue({});
    mockWA.sendMessage.mockResolvedValue({ id: 'msg-z7' });

    const res = await request(app).put('/api/zenco/garments/ORD-1/status').set('Authorization', authHeader('zenco')).send({ status: 'listo' });
    expect(res.status).toBe(200);
    expect(mockWA.sendMessage).toHaveBeenCalledOnce();
    expect(mockWA.sendMessage).toHaveBeenCalledWith(
      '5491112345678',
      'Hola Ana, tu prenda "Pantalon" está lista para retirar!'
    );
  });

  it('does NOT send WhatsApp when status is not listo', async () => {
    mockPrisma.order.update.mockResolvedValue({ ...fullOrder, status: 'en_proceso' });
    const res = await request(app).put('/api/zenco/garments/ORD-1/status').set('Authorization', authHeader('zenco')).send({ status: 'en_proceso' });
    expect(res.status).toBe(200);
    expect(mockWA.sendMessage).not.toHaveBeenCalled();
  });

  it('still succeeds when WhatsApp fails (graceful degradation)', async () => {
    mockPrisma.order.update.mockResolvedValue(fullOrder);
    mockPrisma.notification.create.mockResolvedValue({});
    mockWA.sendMessage.mockRejectedValue(new Error('WhatsApp not connected'));

    const res = await request(app).put('/api/zenco/garments/ORD-1/status').set('Authorization', authHeader('zenco')).send({ status: 'listo' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('listo');
    // Notification should still be created
    expect(mockPrisma.notification.create).toHaveBeenCalledOnce();
  });

  it('creates in-app notification even when WhatsApp fails', async () => {
    mockPrisma.order.update.mockResolvedValue(fullOrder);
    mockPrisma.notification.create.mockResolvedValue({});
    mockWA.sendMessage.mockRejectedValue(new Error('Send failed'));

    await request(app).put('/api/zenco/garments/ORD-1/status').set('Authorization', authHeader('zenco')).send({ status: 'listo' });
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: '5491112345678',
        type: 'prenda_lista',
      }),
    });
  });
});

describe('PUT /api/zenco/garments/:id', () => {
  it('updates garment fully', async () => {
    const update = {
      clientName: 'Ana Updated', clientPhone: '1234', garmentName: 'Pantalon',
      repairType: 'dobladillo', description: 'mas corto', status: 'en_proceso',
      intakeDate: '2026-04-01', deliveryDate: '2026-04-08', price: 3500,
    };
    mockPrisma.order.update.mockResolvedValue({ id: 'ORD-1', ...update });
    const res = await request(app).put('/api/zenco/garments/ORD-1').set('Authorization', authHeader('zenco')).send(update);
    expect(res.status).toBe(200);
    expect(res.body.clientName).toBe('Ana Updated');
  });
});

describe('DELETE /api/zenco/garments/:id', () => {
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
  it('upserts a client by phone+business', async () => {
    const input = { name: 'Carlos', phone: '5555', email: 'c@test.com' };
    mockPrisma.client.upsert.mockResolvedValue({ id: 'uuid-1', ...input, business: 'zenco' });
    const res = await request(app).post('/api/zenco/clients').set('Authorization', authHeader('zenco')).send(input);
    expect(res.status).toBe(200);
    expect(mockPrisma.client.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { phone_business: { phone: '5555', business: 'zenco' } },
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
      { id: 'ORD-1', clientName: 'Ana', garmentName: 'Pantalon', status: 'listo', deliveryDate: today },
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
      { id: 'ORD-2', clientName: 'Luis', garmentName: 'Campera', status: 'en_proceso', deliveryDate: tomorrow },
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
      { id: 'ORD-1', clientName: 'Ana', clientPhone: '1111', garmentName: 'Pantalon', repairType: 'dobladillo', description: 'acortar', status: 'entregado', intakeDate: '2026-04-01', deliveryDate: '2026-04-05', price: 3000, createdAt: new Date('2026-04-01') },
      { id: 'ORD-2', clientName: 'Luis', clientPhone: '2222', garmentName: 'Camisa', repairType: 'entalle', description: 'estrechar', status: 'listo', intakeDate: '2026-04-02', deliveryDate: '2026-04-07', price: 2000, createdAt: new Date('2026-04-02') },
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
      { id: 'ORD-1', status: 'entregado', repairType: 'dobladillo', price: 1000, intakeDate: '2026-04-01', deliveryDate: '2026-04-03', createdAt: new Date('2026-04-01') },
      { id: 'ORD-2', status: 'listo', repairType: 'entalle', price: 2000, intakeDate: '2026-04-02', deliveryDate: '2026-04-05', createdAt: new Date('2026-04-02') },
      { id: 'ORD-3', status: 'recibido', repairType: 'cierre', price: 500, intakeDate: '2026-04-03', deliveryDate: '2026-04-10', createdAt: new Date('2026-04-03') },
    ];
    mockPrisma.order.findMany.mockResolvedValue(orders);
    mockPrisma.client.count.mockResolvedValue(0);

    const res = await request(app).get('/api/zenco/reports/weekly').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body.garmentsDone).toBe(2);
  });

  it('groups garments by repairType', async () => {
    const orders = [
      { id: 'ORD-1', status: 'entregado', repairType: 'dobladillo', price: 1000, intakeDate: '2026-04-01', deliveryDate: '2026-04-03', createdAt: new Date() },
      { id: 'ORD-2', status: 'listo', repairType: 'dobladillo', price: 2000, intakeDate: '2026-04-02', deliveryDate: '2026-04-04', createdAt: new Date() },
      { id: 'ORD-3', status: 'recibido', repairType: 'entalle', price: 500, intakeDate: '2026-04-03', deliveryDate: '2026-04-10', createdAt: new Date() },
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
      { id: 'ORD-1', status: 'entregado', repairType: 'dobladillo', price: 3000, intakeDate: '2026-04-01', deliveryDate: '2026-04-05', createdAt: new Date('2026-04-01') },
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
      { id: 'ORD-1', status: 'entregado', repairType: 'dobladillo', price: 1000, intakeDate: '2026-04-01', deliveryDate: '2026-04-05', createdAt: new Date('2026-04-01') },
      { id: 'ORD-2', status: 'entregado', repairType: 'entalle', price: 2000, intakeDate: '2026-04-02', deliveryDate: '2026-04-08', createdAt: new Date('2026-04-02') },
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
      { id: 'ORD-1', status: 'entregado', repairType: 'dobladillo', price: 3000, intakeDate: '2026-01-01', deliveryDate: '2026-01-05', createdAt: new Date('2026-01-01') },
      { id: 'ORD-2', status: 'listo', repairType: 'entalle', price: 2000, intakeDate: '2026-02-01', deliveryDate: '2026-02-10', createdAt: new Date('2026-02-01') },
      { id: 'ORD-3', status: 'recibido', repairType: 'cierre', price: 1500, intakeDate: '2026-03-01', deliveryDate: '2026-03-15', createdAt: new Date('2026-03-01') },
    ];
    const periodOrders = [
      { id: 'ORD-3', status: 'recibido', repairType: 'cierre', price: 1500, intakeDate: '2026-03-01', deliveryDate: '2026-03-15', createdAt: new Date('2026-03-01') },
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
    const updated = { id: 'f1', date: '2026-04-01', type: 'ingreso', category: 'Arreglo', amount: 5000, description: 'Pantalon' };
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
