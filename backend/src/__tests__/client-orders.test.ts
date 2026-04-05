import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { app } from '../index.js';
import { authHeader } from './setup.js';

const mockPrisma = prisma as unknown as {
  client: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  order: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

const clientId = 'uuid-client-1';
const clientPhone = '11-2222-3333';

const mockClient = {
  id: clientId,
  name: 'Ana Garcia',
  phone: clientPhone,
  business: 'zenco',
  createdAt: new Date().toISOString(),
};

const mockOrders = [
  {
    id: 'ORD-3',
    clientName: 'Ana Garcia',
    clientPhone,
    garmentName: 'Blazer',
    repairType: 'entalle',
    description: 'achicar hombros',
    status: 'listo',
    intakeDate: '2026-03-20',
    deliveryDate: '2026-04-01',
    price: 6000,
    createdAt: '2026-03-20T10:00:00.000Z',
  },
  {
    id: 'ORD-2',
    clientName: 'Ana Garcia',
    clientPhone,
    garmentName: 'Vestido',
    repairType: 'dobladillo',
    description: 'acortar',
    status: 'en_proceso',
    intakeDate: '2026-03-10',
    deliveryDate: '2026-03-25',
    price: 4500,
    createdAt: '2026-03-10T09:00:00.000Z',
  },
  {
    id: 'ORD-1',
    clientName: 'Ana Garcia',
    clientPhone,
    garmentName: 'Pantalon',
    repairType: 'dobladillo',
    description: 'acortar',
    status: 'entregado',
    intakeDate: '2026-01-15',
    deliveryDate: '2026-01-20',
    price: 3000,
    createdAt: '2026-01-15T08:00:00.000Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

// --- GET /api/zenco/clients/:id/orders ---

describe('GET /api/zenco/clients/:id/orders', () => {
  it('returns 404 when client does not exist', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/zenco/clients/nonexistent/orders').set('Authorization', authHeader('zenco'));

    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
  });

  it('returns orders with summary stats for existing client', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(mockClient);
    mockPrisma.order.findMany.mockResolvedValue(mockOrders);

    const res = await request(app).get(`/api/zenco/clients/${clientId}/orders`).set('Authorization', authHeader('zenco'));

    expect(res.status).toBe(200);
    expect(res.body.client).toMatchObject({ id: clientId, name: 'Ana Garcia' });
    expect(res.body.orders).toHaveLength(3);
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.totalOrders).toBe(3);
    expect(res.body.summary.totalGarments).toBe(3);
  });

  it('returns orders sorted by intakeDate desc', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(mockClient);
    mockPrisma.order.findMany.mockResolvedValue(mockOrders);

    const res = await request(app).get(`/api/zenco/clients/${clientId}/orders`).set('Authorization', authHeader('zenco'));

    expect(res.status).toBe(200);
    // Verify prisma was called with desc order
    const call = mockPrisma.order.findMany.mock.calls[0][0];
    expect(call.orderBy).toMatchObject({ intakeDate: 'desc' });
  });

  it('returns summary with garments by status', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(mockClient);
    mockPrisma.order.findMany.mockResolvedValue(mockOrders);

    const res = await request(app).get(`/api/zenco/clients/${clientId}/orders`).set('Authorization', authHeader('zenco'));

    expect(res.status).toBe(200);
    expect(res.body.summary.garmentsByStatus).toEqual({
      listo: 1,
      en_proceso: 1,
      entregado: 1,
    });
  });

  it('returns empty orders with zeroed stats for a client with no orders', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(mockClient);
    mockPrisma.order.findMany.mockResolvedValue([]);

    const res = await request(app).get(`/api/zenco/clients/${clientId}/orders`).set('Authorization', authHeader('zenco'));

    expect(res.status).toBe(200);
    expect(res.body.orders).toEqual([]);
    expect(res.body.summary.totalOrders).toBe(0);
    expect(res.body.summary.totalGarments).toBe(0);
    expect(res.body.summary.garmentsByStatus).toEqual({});
  });

  it('filters by status query param', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(mockClient);
    mockPrisma.order.findMany.mockResolvedValue([mockOrders[1]]); // only en_proceso

    const res = await request(app).get(`/api/zenco/clients/${clientId}/orders?status=en_proceso`).set('Authorization', authHeader('zenco'));

    expect(res.status).toBe(200);
    // Verify status filter was passed to prisma
    const call = mockPrisma.order.findMany.mock.calls[0][0];
    expect(call.where.status).toBe('en_proceso');
  });

  it('filters by from date query param', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(mockClient);
    mockPrisma.order.findMany.mockResolvedValue(mockOrders.slice(0, 2));

    const res = await request(app).get(`/api/zenco/clients/${clientId}/orders?from=2026-03-01`).set('Authorization', authHeader('zenco'));

    expect(res.status).toBe(200);
    const call = mockPrisma.order.findMany.mock.calls[0][0];
    expect(call.where.intakeDate.gte).toBe('2026-03-01');
  });

  it('filters by to date query param', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(mockClient);
    mockPrisma.order.findMany.mockResolvedValue(mockOrders.slice(2));

    const res = await request(app).get(`/api/zenco/clients/${clientId}/orders?to=2026-02-01`).set('Authorization', authHeader('zenco'));

    expect(res.status).toBe(200);
    const call = mockPrisma.order.findMany.mock.calls[0][0];
    expect(call.where.intakeDate.lte).toBe('2026-02-01');
  });

  it('combines from and to date filters', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(mockClient);
    mockPrisma.order.findMany.mockResolvedValue(mockOrders.slice(1, 2));

    const res = await request(app)
      .get(`/api/zenco/clients/${clientId}/orders?from=2026-03-01&to=2026-03-31`)
      .set('Authorization', authHeader('zenco'));

    expect(res.status).toBe(200);
    const call = mockPrisma.order.findMany.mock.calls[0][0];
    expect(call.where.intakeDate.gte).toBe('2026-03-01');
    expect(call.where.intakeDate.lte).toBe('2026-03-31');
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(mockClient);
    mockPrisma.order.findMany.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get(`/api/zenco/clients/${clientId}/orders`).set('Authorization', authHeader('zenco'));

    expect(res.status).toBe(500);
    expect(res.body.error).toBeTruthy();
  });

  it('queries only orders for this client phone', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(mockClient);
    mockPrisma.order.findMany.mockResolvedValue(mockOrders);

    await request(app).get(`/api/zenco/clients/${clientId}/orders`).set('Authorization', authHeader('zenco'));

    const call = mockPrisma.order.findMany.mock.calls[0][0];
    expect(call.where.clientPhone).toBe(clientPhone);
  });
});
