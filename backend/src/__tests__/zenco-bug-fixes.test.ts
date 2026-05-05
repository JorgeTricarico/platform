/**
 * TDD RED tests para los 3 bugs de zenco.ts
 * C1 — deleteMany+createMany sin transacción atómica
 * C2 — deposit sobreescrito al marcar "entregado" via status endpoint
 * B3 — orden de rutas Express /clients/search vs /clients/:id
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { app } from '../index.js';
import { authHeader } from './setup.js';

// Mock whatsappService para evitar side effects
vi.mock('../services/whatsapp.js', () => ({
  whatsappService: {
    sendMessage: vi.fn().mockResolvedValue({ id: 'msg-test' }),
    getStatus: vi.fn(),
    getQR: vi.fn(),
    onMessage: vi.fn(),
  },
}));

const mockPrisma = prisma as unknown as {
  order: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  orderItem: {
    deleteMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
  zencoFinance: {
    create: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  client: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  notification: {
    create: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const makeOrder = (overrides = {}) => ({
  id: 'ORD-BUG-1',
  orderNumber: 99,
  clientName: 'TestUser',
  clientPhone: '9999',
  status: 'recibido',
  intakeDate: '2026-04-01',
  deliveryDate: '2026-04-10',
  deposit: 500,
  items: [
    {
      id: 'ITEM-BUG-1',
      orderId: 'ORD-BUG-1',
      garmentName: 'Pantalon',
      repairType: 'dobladillo',
      description: 'acortar',
      price: 2000,
    },
  ],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// BUG C1 — deleteMany + createMany sin transacción atómica
// ============================================================

describe('C1 — PUT /api/zenco/garments/:id usa transacción atómica', () => {
  const validUpdate = {
    clientName: 'TestUser',
    clientPhone: '9999',
    status: 'en_proceso',
    intakeDate: '2026-04-01',
    deliveryDate: '2026-04-10',
    deposit: 500,
    items: [
      { garmentName: 'Pantalon', repairType: 'dobladillo', description: 'corto', price: 2000 },
    ],
  };

  it('C1a — el reemplazo de items usa prisma.$transaction', async () => {
    const updatedOrder = makeOrder({ status: 'en_proceso' });
    mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
    // $transaction debe ser llamado con una función o array
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
      return fn({
        ...mockPrisma,
        orderItem: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      });
    });
    mockPrisma.order.update.mockResolvedValue(updatedOrder);

    const res = await request(app)
      .put('/api/zenco/garments/ORD-BUG-1')
      .set('Authorization', authHeader('zenco'))
      .send(validUpdate);

    expect(res.status).toBe(200);
    // La clave: $transaction debe haber sido llamado
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });

  it('C1b — si la transacción falla (createMany rechaza), retorna 500 y order.update NO se llama', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
    // $transaction que simula un error interno
    mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed: createMany error'));
    mockPrisma.order.update.mockResolvedValue(makeOrder({ status: 'en_proceso' }));

    const res = await request(app)
      .put('/api/zenco/garments/ORD-BUG-1')
      .set('Authorization', authHeader('zenco'))
      .send(validUpdate);

    expect(res.status).toBe(500);
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it('C1c — happy path: updateOrder retorna la orden actualizada correctamente', async () => {
    const updatedOrder = makeOrder({
      status: 'en_proceso',
      items: [
        {
          id: 'ITEM-NEW',
          orderId: 'ORD-BUG-1',
          garmentName: 'Pantalon',
          repairType: 'dobladillo',
          description: 'corto',
          price: 2000,
        },
      ],
    });
    mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
      return fn({
        ...mockPrisma,
        orderItem: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      });
    });
    mockPrisma.order.update.mockResolvedValue(updatedOrder);

    const res = await request(app)
      .put('/api/zenco/garments/ORD-BUG-1')
      .set('Authorization', authHeader('zenco'))
      .send(validUpdate);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('en_proceso');
  });
});

// ============================================================
// BUG C2 — deposit sobreescrito al marcar "entregado"
// ============================================================

describe('C2 — PUT /api/zenco/garments/:id/status NO sobreescribe deposit al entregar', () => {
  it('C2a — marcar entregado con deposit=500 y totalPrice=2000: deposit sigue siendo 500', async () => {
    const orderWithDeposit = makeOrder({
      id: 'ORD-DEP-1',
      orderNumber: 100,
      deposit: 500,
      items: [
        {
          id: 'ITEM-DEP-1',
          orderId: 'ORD-DEP-1',
          garmentName: 'Pantalon',
          repairType: 'dobladillo',
          description: '',
          price: 2000,
        },
      ],
    });
    // order.update debe ser llamado SIN deposit en el data
    const updatedOrder = { ...orderWithDeposit, status: 'entregado' };
    mockPrisma.order.findUnique.mockResolvedValue(orderWithDeposit);
    mockPrisma.order.update.mockResolvedValue(updatedOrder);
    mockPrisma.zencoFinance.upsert.mockResolvedValue({});

    const res = await request(app)
      .put('/api/zenco/garments/ORD-DEP-1/status')
      .set('Authorization', authHeader('zenco'))
      .send({ status: 'entregado' });

    expect(res.status).toBe(200);

    // El data pasado a order.update NO debe incluir deposit
    const updateCall = mockPrisma.order.update.mock.calls[0];
    expect(updateCall).toBeDefined();
    const updateData = updateCall[0].data;
    expect(updateData).not.toHaveProperty('deposit');
  });

  it('C2b — marcar entregado: se registra zencoFinance con el saldo correcto (2000-500=1500)', async () => {
    const orderWithDeposit = makeOrder({
      id: 'ORD-DEP-2',
      orderNumber: 101,
      deposit: 500,
      items: [
        {
          id: 'ITEM-DEP-2',
          orderId: 'ORD-DEP-2',
          garmentName: 'Campera',
          repairType: 'cierre',
          description: '',
          price: 2000,
        },
      ],
    });
    const updatedOrder = { ...orderWithDeposit, status: 'entregado' };
    mockPrisma.order.findUnique.mockResolvedValue(orderWithDeposit);
    mockPrisma.order.update.mockResolvedValue(updatedOrder);
    mockPrisma.zencoFinance.upsert.mockResolvedValue({});

    await request(app)
      .put('/api/zenco/garments/ORD-DEP-2/status')
      .set('Authorization', authHeader('zenco'))
      .send({ status: 'entregado' });

    // Se debe registrar un finance con amount = totalPrice - deposit = 2000 - 500 = 1500
    expect(mockPrisma.zencoFinance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: 'income',
          category: 'entrega_prenda',
          amount: 1500,
        }),
      })
    );
  });

  it('C2c — marcar entregado con deposit == totalPrice: NO se registra finance (saldo=0)', async () => {
    const orderPagado = makeOrder({
      id: 'ORD-DEP-3',
      orderNumber: 102,
      deposit: 2000, // ya pagado completo
      items: [
        {
          id: 'ITEM-DEP-3',
          orderId: 'ORD-DEP-3',
          garmentName: 'Vestido',
          repairType: 'entalle',
          description: '',
          price: 2000,
        },
      ],
    });
    const updatedOrder = { ...orderPagado, status: 'entregado' };
    mockPrisma.order.findUnique.mockResolvedValue(orderPagado);
    mockPrisma.order.update.mockResolvedValue(updatedOrder);
    mockPrisma.zencoFinance.upsert.mockResolvedValue({});

    await request(app)
      .put('/api/zenco/garments/ORD-DEP-3/status')
      .set('Authorization', authHeader('zenco'))
      .send({ status: 'entregado' });

    // Saldo = 0, no debe llamar upsert de finance
    expect(mockPrisma.zencoFinance.upsert).not.toHaveBeenCalled();
  });
});

// ============================================================
// BUG B3 — Orden de rutas Express /clients/search vs /clients/:id
// ============================================================

describe('B3 — GET /api/zenco/clients/search no es atrapado por /:id', () => {
  it('B3a — GET /clients/search?q=test retorna 200 con array de clientes', async () => {
    mockPrisma.client.findMany.mockResolvedValue([
      { id: 'c1', name: 'Test User', phone: '1234', business: 'zenco' },
    ]);

    const res = await request(app)
      .get('/api/zenco/clients/search?q=test')
      .set('Authorization', authHeader('zenco'));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('B3b — GET /clients/search llama a client.findMany con filtros correctos', async () => {
    mockPrisma.client.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/zenco/clients/search?q=maria')
      .set('Authorization', authHeader('zenco'));

    expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          business: 'zenco',
          OR: expect.arrayContaining([
            expect.objectContaining({ name: expect.objectContaining({ contains: 'maria' }) }),
          ]),
        }),
      })
    );
  });

  it('B3c — GET /clients/search?q= (vacío) retorna array vacío sin llamar findMany', async () => {
    const res = await request(app)
      .get('/api/zenco/clients/search')
      .set('Authorization', authHeader('zenco'));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(mockPrisma.client.findMany).not.toHaveBeenCalled();
  });
});
