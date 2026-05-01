import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { publicRoutes } from '../routes/public.js';
import '../__tests__/setup.js';

// Access the mock prisma from the mocked module
import { prisma } from '../db.js';
const mockPrisma = prisma as unknown as {
  order: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const app = express();
app.use(express.json());
app.use('/api/public', publicRoutes);

const baseOrder = {
  id: 'ord-uuid-123',
  orderNumber: 42,
  clientName: 'Ana Perez',
  clientPhone: '1165749397',
  garmentName: 'Pantalón',
  repairType: 'dobladillo',
  description: 'Dobladillo simple',
  status: 'listo',
  deliveryDate: '2026-05-10',
  price: 3000,
  deposit: 1000,
  scanCount: 5,
  lastScannedAt: '2026-05-01T10:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/public/zenco/order/:id', () => {
  it('returns order data by orderNumber', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(baseOrder);
    mockPrisma.order.update.mockResolvedValue({ ...baseOrder, scanCount: 6 });

    const res = await request(app).get('/api/public/zenco/order/42');
    expect(res.status).toBe(200);
    expect(res.body.clientName).toBe('Ana Perez');
    expect(res.body.status).toBe('listo');
  });

  it('increments scanCount on every fetch', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(baseOrder);
    mockPrisma.order.update.mockResolvedValue({ ...baseOrder, scanCount: 6 });

    await request(app).get('/api/public/zenco/order/42');

    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ord-uuid-123' },
        data: expect.objectContaining({
          scanCount: { increment: 1 },
        }),
      })
    );
  });

  it('sets lastScannedAt on fetch', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(baseOrder);
    mockPrisma.order.update.mockResolvedValue({ ...baseOrder, scanCount: 6 });

    await request(app).get('/api/public/zenco/order/42');

    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lastScannedAt: expect.any(String),
        }),
      })
    );
  });

  it('returns 404 when order not found', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/public/zenco/order/9999');
    expect(res.status).toBe(404);
  });

  it('does not expose scanCount to public clients', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(baseOrder);
    mockPrisma.order.update.mockResolvedValue({ ...baseOrder, scanCount: 6 });
    mockPrisma.order.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/public/zenco/order/42');
    expect(res.body.scanCount).toBeUndefined();
    expect(res.body.lastScannedAt).toBeUndefined();
  });

  it('incluye otherActiveOrders en la respuesta', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(baseOrder);
    mockPrisma.order.update.mockResolvedValue({ ...baseOrder, scanCount: 6 });
    mockPrisma.order.findMany.mockResolvedValue([
      {
        orderNumber: 99,
        garmentName: 'Camisa',
        repairType: 'cierre',
        status: 'en_proceso',
        deliveryDate: '2026-05-20',
      },
    ]);

    const res = await request(app).get('/api/public/zenco/order/42');
    expect(res.status).toBe(200);
    expect(res.body.otherActiveOrders).toBeDefined();
    expect(res.body.otherActiveOrders).toHaveLength(1);
    expect(res.body.otherActiveOrders[0].garmentName).toBe('Camisa');
    expect(res.body.otherActiveOrders[0].orderNumber).toBe(99);
  });

  it('otherActiveOrders está vacío cuando no hay otras órdenes', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(baseOrder);
    mockPrisma.order.update.mockResolvedValue({ ...baseOrder, scanCount: 6 });
    mockPrisma.order.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/public/zenco/order/42');
    expect(res.status).toBe(200);
    expect(res.body.otherActiveOrders).toBeDefined();
    expect(res.body.otherActiveOrders).toHaveLength(0);
  });
});
