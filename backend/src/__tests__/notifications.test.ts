import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { app } from '../index.js';
import { authHeader } from './setup.js';

const mockPrisma = prisma as unknown as {
  order: { update: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  client: { findFirst: ReturnType<typeof vi.fn> };
  notification: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  // Route now does findUnique before update — default to a non-entregado prev state
  mockPrisma.order.findUnique.mockResolvedValue({
    id: 'ORD-1', orderNumber: 1, status: 'recibido', deposit: 0,
    items: [{ id: 'I1', orderId: 'ORD-1', garmentName: 'Vestido', repairType: 'diseño', description: '', price: 1000 }],
  });
});

// -------------------------------------------------------
// Notification side-effect: marking a garment as "listo"
// creates a notification
// -------------------------------------------------------

describe('PUT /api/zenco/garments/:id/status → listo', () => {
  it('creates a notification when status is set to listo', async () => {
    const order = {
      id: 'ORD-1',
      orderNumber: 2,
      clientName: 'Maria',
      clientPhone: '1111',
      garmentName: 'Vestido',
      status: 'listo',
    };
    mockPrisma.order.update.mockResolvedValue(order);
    mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-uuid-abc', phone: '1111', business: 'zenco' });
    mockPrisma.notification.create.mockResolvedValue({
      id: 'notif-1',
      clientId: 'client-uuid-abc',
      message: 'Tu prenda "Vestido" está lista para retirar.',
      type: 'prenda_lista',
      read: false,
      createdAt: new Date().toISOString(),
    });

    const res = await request(app)
      .put('/api/zenco/garments/ORD-1/status')
      .set('Authorization', authHeader('zenco'))
      .send({ status: 'listo' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('listo');
    expect(mockPrisma.notification.create).toHaveBeenCalledOnce();

    const notifData = mockPrisma.notification.create.mock.calls[0][0].data;
    expect(notifData.clientId).toBe('client-uuid-abc');
    expect(notifData.type).toBe('prenda_lista');
    expect(notifData.message).toMatch(/pedido|prenda|listo/i);
    expect(notifData.read).toBe(false);
  });

  it('does NOT create a notification when status is not listo', async () => {
    mockPrisma.order.update.mockResolvedValue({
      id: 'ORD-1',
      orderNumber: 3,
      clientName: 'Maria',
      clientPhone: '1111',
      garmentName: 'Vestido',
      status: 'en_proceso',
    });

    const res = await request(app)
      .put('/api/zenco/garments/ORD-1/status')
      .set('Authorization', authHeader('zenco'))
      .send({ status: 'en_proceso' });

    expect(res.status).toBe(200);
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });

  it('still returns 500 if order update fails (no notification created)', async () => {
    mockPrisma.order.update.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .put('/api/zenco/garments/ORD-1/status')
      .set('Authorization', authHeader('zenco'))
      .send({ status: 'listo' });

    expect(res.status).toBe(500);
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });
});

// -------------------------------------------------------
// GET /api/zenco/notifications/:clientId
// -------------------------------------------------------

describe('GET /api/zenco/notifications/:clientId', () => {
  it('returns notifications for a client ordered by createdAt desc', async () => {
    const notifications = [
      {
        id: 'notif-2',
        clientId: '1111',
        message: 'Tu prenda "Camisa" está lista.',
        type: 'prenda_lista',
        read: false,
        createdAt: '2026-04-05T10:00:00.000Z',
      },
      {
        id: 'notif-1',
        clientId: '1111',
        message: 'Tu prenda "Pantalon" está lista.',
        type: 'prenda_lista',
        read: true,
        createdAt: '2026-04-04T10:00:00.000Z',
      },
    ];
    mockPrisma.notification.findMany.mockResolvedValue(notifications);

    const res = await request(app).get('/api/zenco/notifications/1111').set('Authorization', authHeader('zenco'));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].id).toBe('notif-2');
    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: '1111' },
        orderBy: { createdAt: 'desc' },
      })
    );
  });

  it('returns empty array when client has no notifications', async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/zenco/notifications/9999').set('Authorization', authHeader('zenco'));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.notification.findMany.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/zenco/notifications/1111').set('Authorization', authHeader('zenco'));

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Error');
  });
});

// -------------------------------------------------------
// PATCH /api/zenco/notifications/:id/read
// -------------------------------------------------------

describe('PATCH /api/zenco/notifications/:id/read', () => {
  it('marks a notification as read', async () => {
    const updated = {
      id: 'notif-1',
      clientId: '1111',
      message: 'Tu prenda está lista.',
      type: 'prenda_lista',
      read: true,
      createdAt: '2026-04-05T10:00:00.000Z',
    };
    mockPrisma.notification.update.mockResolvedValue(updated);

    const res = await request(app).patch('/api/zenco/notifications/notif-1/read').set('Authorization', authHeader('zenco'));

    expect(res.status).toBe(200);
    expect(res.body.read).toBe(true);
    expect(mockPrisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-1' },
      data: { read: true },
    });
  });

  it('returns 500 when notification not found', async () => {
    mockPrisma.notification.update.mockRejectedValue(new Error('Not found'));

    const res = await request(app).patch('/api/zenco/notifications/FAKE/read').set('Authorization', authHeader('zenco'));

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Error');
  });
});
