import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { app } from '../index.js';
import { authHeader } from './setup.js';

const mockPrisma = prisma as unknown as {
  order: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  orderItem: { deleteMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> };
  garmentPhoto: { deleteMany: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Garment registration end-to-end (bug regression)', () => {
  it('POST /api/zenco/garments → GET returns created garment with intakeDate', async () => {
    const input = {
      clientName: 'Ana Martinez',
      clientPhone: '1155667788',
      intakeDate: '2026-04-05',
      deliveryDate: '2026-04-12',
      items: [{ garmentName: 'Pantalon de vestir', repairType: 'dobladillo', description: 'Acortar 3cm', price: 4500 }],
    };

    const createdOrder = {
      id: 'uuid-mock-001',
      orderNumber: 1,
      clientName: 'Ana Martinez',
      clientPhone: '1155667788',
      status: 'recibido',
      intakeDate: '2026-04-05',
      deliveryDate: '2026-04-12',
      deposit: 0,
      createdAt: '2026-04-05T10:00:00.000Z',
      items: [{ id: 'ITEM-1', orderId: 'uuid-mock-001', garmentName: 'Pantalon de vestir', repairType: 'dobladillo', description: 'Acortar 3cm', price: 4500 }],
    };

    // Step 1: Create the garment
    mockPrisma.order.create.mockResolvedValue(createdOrder);
    const createRes = await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send(input);
    expect(createRes.status).toBe(200);
    expect(createRes.body.id).toBe('uuid-mock-001');

    // Verify fields passed to Prisma — phone llega normalizado (5491155667788)
    const callData = mockPrisma.order.create.mock.calls[0][0].data;
    expect(callData.clientName).toBe('Ana Martinez');
    expect(callData.clientPhone).toBe('5491155667788');
    expect(callData.intakeDate).toBe('2026-04-05');
    expect(callData.deliveryDate).toBe('2026-04-12');
    expect(callData.status).toBe('recibido');
    expect(callData.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(callData.items.create[0].garmentName).toBe('Pantalon de vestir');
    expect(callData.items.create[0].repairType).toBe('dobladillo');
    expect(callData.items.create[0].description).toBe('Acortar 3cm');
    expect(callData.items.create[0].price).toBe(4500);

    // Step 2: List garments returns the created one
    mockPrisma.order.findMany.mockResolvedValue([createdOrder]);
    const listRes = await request(app).get('/api/zenco/garments').set('Authorization', authHeader('zenco'));
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].intakeDate).toBe('2026-04-05');
    expect(listRes.body[0].items[0].price).toBe(4500);
  });

  it('POST without intakeDate defaults to today', async () => {
    const input = {
      clientName: 'Test', clientPhone: '0000',
      deliveryDate: '2026-04-20',
      items: [{ garmentName: 'Remera', repairType: 'estampar', description: 'logo', price: 2000 }],
    };
    mockPrisma.order.create.mockResolvedValue({
      id: '0002', orderNumber: 2, clientName: 'Test', clientPhone: '0000',
      status: 'recibido', intakeDate: '2026-04-05', deliveryDate: '2026-04-20', deposit: 0,
      items: [{ id: 'I2', orderId: '0002', garmentName: 'Remera', repairType: 'estampar', description: 'logo', price: 2000 }],
    });

    await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send(input);
    const callData = mockPrisma.order.create.mock.calls[0][0].data;
    expect(callData.intakeDate).toBeTruthy();
    expect(callData.intakeDate).toMatch(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/);
  });

  it('full CRUD cycle: create → update status → update full → delete', async () => {
    const garment = {
      id: '0003', orderNumber: 3, clientName: 'Test', clientPhone: '1111',
      intakeDate: '2026-04-05', deliveryDate: '2026-04-15',
      status: 'recibido', deposit: 0,
      items: [{ id: 'I3', orderId: '0003', garmentName: 'Jean', repairType: 'parche', description: 'rodilla', price: 3000 }],
    };

    // Create
    mockPrisma.order.create.mockResolvedValue(garment);
    const r1 = await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send({
      clientName: 'Test', clientPhone: '1111',
      intakeDate: '2026-04-05', deliveryDate: '2026-04-15',
      items: [{ garmentName: 'Jean', repairType: 'parche', description: 'rodilla', price: 3000 }],
    });
    expect(r1.status).toBe(200);

    // Update status
    mockPrisma.order.findUnique.mockResolvedValue(garment);
    mockPrisma.order.update.mockResolvedValue({ ...garment, status: 'listo' });
    const r2 = await request(app).put('/api/zenco/garments/0003/status').set('Authorization', authHeader('zenco')).send({ status: 'listo' });
    expect(r2.status).toBe(200);
    expect(r2.body.status).toBe('listo');

    // Full update
    const updatedGarment = { ...garment, items: [{ ...garment.items[0], price: 3500 }], status: 'entregado' };
    mockPrisma.order.findUnique.mockResolvedValue({ ...garment, status: 'listo' });
    mockPrisma.order.update.mockResolvedValue(updatedGarment);
    mockPrisma.orderItem.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.orderItem.createMany.mockResolvedValue({ count: 1 });
    const r3 = await request(app).put('/api/zenco/garments/0003').set('Authorization', authHeader('zenco')).send({
      clientName: 'Test', clientPhone: '1111',
      intakeDate: '2026-04-05', deliveryDate: '2026-04-15',
      status: 'entregado',
      items: [{ garmentName: 'Jean', repairType: 'parche', description: 'rodilla', price: 3500 }],
    });
    expect(r3.status).toBe(200);
    expect(r3.body.items[0].price).toBe(3500);

    // Delete
    mockPrisma.garmentPhoto.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.order.delete.mockResolvedValue({});
    const r4 = await request(app).delete('/api/zenco/garments/0003').set('Authorization', authHeader('zenco'));
    expect(r4.status).toBe(200);
    expect(r4.body.success).toBe(true);
  });
});
