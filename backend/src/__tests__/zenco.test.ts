import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { app } from '../index.js';

const mockPrisma = prisma as unknown as {
  order: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn>; groupBy: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  zencoFinance: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  client: { findMany: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
});

// --- GARMENTS CRUD ---

describe('GET /api/zenco/garments', () => {
  it('returns empty array when no garments', async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/zenco/garments');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns garments sorted by deliveryDate', async () => {
    const garments = [
      { id: 'ORD-1', clientName: 'Ana', clientPhone: '1234', garmentName: 'Pantalon', repairType: 'dobladillo', description: 'acortar', status: 'recibido', intakeDate: '2026-04-01', deliveryDate: '2026-04-10', price: 3000 },
      { id: 'ORD-2', clientName: 'Luis', clientPhone: '5678', garmentName: 'Campera', repairType: 'cierre', description: 'cambiar cierre', status: 'en_proceso', intakeDate: '2026-04-02', deliveryDate: '2026-04-12', price: 5000 },
    ];
    mockPrisma.order.findMany.mockResolvedValue(garments);
    const res = await request(app).get('/api/zenco/garments');
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

    const res = await request(app).post('/api/zenco/garments').send(input);
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

    await request(app).post('/api/zenco/garments').send(input);
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

    await request(app).post('/api/zenco/garments').send(input);
    const callData = mockPrisma.order.create.mock.calls[0][0].data;
    expect(callData.price).toBe(3000);
    expect(typeof callData.price).toBe('number');
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.order.create.mockRejectedValue(new Error('DB error'));
    const res = await request(app).post('/api/zenco/garments').send({
      clientName: 'Fail', clientPhone: '0000', garmentName: 'X',
      repairType: 'dobladillo', description: 'x', deliveryDate: '2026-04-20', price: 1000,
    });
    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Error');
  });
});

describe('PUT /api/zenco/garments/:id/status', () => {
  it('updates garment status', async () => {
    mockPrisma.order.update.mockResolvedValue({ id: 'ORD-1', status: 'listo' });
    const res = await request(app).put('/api/zenco/garments/ORD-1/status').send({ status: 'listo' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('listo');
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
    const res = await request(app).put('/api/zenco/garments/ORD-1').send(update);
    expect(res.status).toBe(200);
    expect(res.body.clientName).toBe('Ana Updated');
  });
});

describe('DELETE /api/zenco/garments/:id', () => {
  it('deletes a garment', async () => {
    mockPrisma.order.delete.mockResolvedValue({});
    const res = await request(app).delete('/api/zenco/garments/ORD-1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 500 if garment not found', async () => {
    mockPrisma.order.delete.mockRejectedValue(new Error('Not found'));
    const res = await request(app).delete('/api/zenco/garments/FAKE');
    expect(res.status).toBe(500);
  });
});

// --- FINANCES ---

describe('GET /api/zenco/finances', () => {
  it('returns finances list', async () => {
    mockPrisma.zencoFinance.findMany.mockResolvedValue([{ id: 'FIN-1', date: '2026-04-01', type: 'income', category: 'Arreglos', amount: 5000, description: 'Pago cliente' }]);
    const res = await request(app).get('/api/zenco/finances');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('POST /api/zenco/finances', () => {
  it('creates a finance entry', async () => {
    const input = { date: '2026-04-05', type: 'expense', category: 'Insumos', amount: 1200, description: 'Hilos' };
    mockPrisma.zencoFinance.create.mockResolvedValue({ id: 'FIN-Z-123', ...input });
    const res = await request(app).post('/api/zenco/finances').send(input);
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('Insumos');
  });
});

// --- CLIENTS ---

describe('GET /api/zenco/clients', () => {
  it('returns only zenco clients', async () => {
    mockPrisma.client.findMany.mockResolvedValue([{ id: 'c1', name: 'Maria', phone: '1111', business: 'zenco' }]);
    const res = await request(app).get('/api/zenco/clients');
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
    const res = await request(app).post('/api/zenco/clients').send(input);
    expect(res.status).toBe(200);
    expect(mockPrisma.client.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { phone_business: { phone: '5555', business: 'zenco' } },
    }));
  });
});

describe('GET /api/zenco/clients/search', () => {
  it('searches clients by query', async () => {
    mockPrisma.client.findMany.mockResolvedValue([{ id: 'c1', name: 'Maria Lopez', phone: '1111', business: 'zenco' }]);
    const res = await request(app).get('/api/zenco/clients/search?q=maria');
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

    const res = await request(app).get('/api/zenco/dashboard');
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

    const res = await request(app).get('/api/zenco/dashboard');
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

    const res = await request(app).get('/api/zenco/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.upcomingDeliveries).toHaveLength(1);
    expect(res.body.upcomingDeliveries[0].clientName).toBe('Luis');
  });

  it('returns empty dashboard when no orders exist', async () => {
    mockPrisma.order.groupBy.mockResolvedValue([]);
    mockPrisma.order.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/zenco/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.byStatus).toEqual({});
    expect(res.body.todayDeliveries).toEqual([]);
    expect(res.body.upcomingDeliveries).toEqual([]);
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.order.groupBy.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/zenco/dashboard');
    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Error');
  });
});

// --- VALIDATION ---

describe('Zenco validation', () => {
  it('POST /garments returns 400 when clientName is missing', async () => {
    const res = await request(app).post('/api/zenco/garments').send({
      clientPhone: '1234', garmentName: 'Pantalon', repairType: 'dobladillo',
      description: 'acortar', deliveryDate: '2026-04-10', price: 3000,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos invalidos');
  });

  it('POST /garments returns 400 when price is missing', async () => {
    const res = await request(app).post('/api/zenco/garments').send({
      clientName: 'Ana', clientPhone: '1234', garmentName: 'Pantalon',
      repairType: 'dobladillo', description: 'acortar', deliveryDate: '2026-04-10',
    });
    expect(res.status).toBe(400);
  });

  it('PUT /garments/:id/status returns 400 when status is empty', async () => {
    const res = await request(app).put('/api/zenco/garments/ORD-1/status').send({});
    expect(res.status).toBe(400);
  });

  it('POST /finances returns 400 when amount is not a number', async () => {
    const res = await request(app).post('/api/zenco/finances').send({
      date: '2026-04-05', type: 'income', category: 'Arreglos',
      amount: 'not-a-number', description: 'Test',
    });
    expect(res.status).toBe(400);
  });

  it('POST /clients returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/zenco/clients').send({ phone: '1234' });
    expect(res.status).toBe(400);
  });
});

// --- HEALTH CHECK ---

describe('GET /health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
