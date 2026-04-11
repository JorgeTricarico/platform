import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { app } from '../index.js';
import { authHeader } from './setup.js';

vi.mock('../services/whatsapp.js', () => ({
  whatsappService: {
    sendMessage: vi.fn().mockResolvedValue({ id: 'msg-mock' }),
    getStatus: vi.fn(),
    getQR: vi.fn(),
    onMessage: vi.fn(),
  },
}));

const mockPrisma = prisma as unknown as {
  order: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  zencoFinance: { findMany: ReturnType<typeof vi.fn> };
  mgMasajesFinance: { findMany: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================
// LOCATION FIELD ON ORDER
// ===========================================

describe('Location field on Order', () => {
  it('POST /garments accepts location field', async () => {
    const input = {
      clientName: 'Ana', clientPhone: '1111', garmentName: 'Pantalón',
      repairType: 'dobladillo', description: 'acortar 5cm',
      deliveryDate: '2026-05-01', price: 3000, location: 'Estante 3',
    };
    mockPrisma.order.create.mockResolvedValue({ id: 'ORD-LOC-1', orderNumber: 1, ...input, status: 'recibido', intakeDate: '2026-04-05' });

    const res = await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send(input);
    expect(res.status).toBe(200);
    const callData = mockPrisma.order.create.mock.calls[0][0].data;
    expect(callData.location).toBe('Estante 3');
  });

  it('POST /garments sets location to null when not provided', async () => {
    const input = {
      clientName: 'Luis', clientPhone: '2222', garmentName: 'Campera',
      repairType: 'cierre', description: 'cambiar cierre',
      deliveryDate: '2026-05-05', price: 5000,
    };
    mockPrisma.order.create.mockResolvedValue({ id: 'ORD-LOC-2', orderNumber: 2, ...input, status: 'recibido', intakeDate: '2026-04-05', location: null });

    const res = await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send(input);
    expect(res.status).toBe(200);
    const callData = mockPrisma.order.create.mock.calls[0][0].data;
    expect(callData.location).toBeNull();
  });

  it('PUT /garments/:id updates location field', async () => {
    const input = {
      clientName: 'Ana', clientPhone: '1111', garmentName: 'Pantalón',
      repairType: 'dobladillo', description: 'acortar',
      deliveryDate: '2026-05-01', price: 3000,
      intakeDate: '2026-04-05', status: 'en_proceso', location: 'Perchero B',
    };
    mockPrisma.order.update.mockResolvedValue({ id: 'ORD-LOC-1', orderNumber: 3, ...input });
    mockPrisma.order.findUnique.mockResolvedValue({ id: 'ORD-LOC-1', orderNumber: 3, status: 'recibido', deposit: 0, price: 3000 });

    const res = await request(app).put('/api/zenco/garments/ORD-LOC-1').set('Authorization', authHeader('zenco')).send(input);
    expect(res.status).toBe(200);
    const callData = mockPrisma.order.update.mock.calls[0][0].data;
    expect(callData.location).toBe('Perchero B');
  });
});

// ===========================================
// FINANCE MONTH FILTER
// ===========================================

describe('Finance month filter', () => {
  const sampleFinances = [
    { id: 'FIN-Z-1', date: '2026-04-05', type: 'income', category: 'Arreglo', amount: 3000, description: 'Pantalón' },
    { id: 'FIN-Z-2', date: '2026-04-15', type: 'expense', category: 'Hilo', amount: 500, description: 'Insumos' },
    { id: 'FIN-Z-3', date: '2026-03-10', type: 'income', category: 'Arreglo', amount: 4000, description: 'Vestido' },
  ];

  it('GET /finances without month returns all', async () => {
    mockPrisma.zencoFinance.findMany.mockResolvedValue(sampleFinances);
    const res = await request(app).get('/api/zenco/finances').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    // Should call with empty where
    expect(mockPrisma.zencoFinance.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { date: 'desc' },
    });
  });

  it('GET /finances?month=2026-04 filters by month', async () => {
    mockPrisma.zencoFinance.findMany.mockResolvedValue(sampleFinances.slice(0, 2));
    const res = await request(app).get('/api/zenco/finances?month=2026-04').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    const callArgs = mockPrisma.zencoFinance.findMany.mock.calls[0][0];
    expect(callArgs.where).toEqual({
      date: { gte: '2026-04-01', lte: '2026-04-30' },
    });
  });

  it('GET /finances?month=invalid ignores bad month format', async () => {
    mockPrisma.zencoFinance.findMany.mockResolvedValue(sampleFinances);
    const res = await request(app).get('/api/zenco/finances?month=bad-month').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    const callArgs = mockPrisma.zencoFinance.findMany.mock.calls[0][0];
    expect(callArgs.where).toEqual({});
  });

  it('GET /finances?month=2026-02 handles February correctly', async () => {
    mockPrisma.zencoFinance.findMany.mockResolvedValue([]);
    await request(app).get('/api/zenco/finances?month=2026-02').set('Authorization', authHeader('zenco'));
    const callArgs = mockPrisma.zencoFinance.findMany.mock.calls[0][0];
    expect(callArgs.where).toEqual({
      date: { gte: '2026-02-01', lte: '2026-02-28' },
    });
  });

  // Damian finances
  it('GET /api/mg_masajes/finances?month=2026-04 filters by month', async () => {
    mockPrisma.mgMasajesFinance.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/mg_masajes/finances?month=2026-04').set('Authorization', authHeader('mg_masajes'));
    expect(res.status).toBe(200);
    const callArgs = mockPrisma.mgMasajesFinance.findMany.mock.calls[0][0];
    expect(callArgs.where).toEqual({
      date: { gte: '2026-04-01', lte: '2026-04-30' },
    });
  });

  it('GET /api/mg_masajes/finances without month returns all', async () => {
    mockPrisma.mgMasajesFinance.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/mg_masajes/finances').set('Authorization', authHeader('mg_masajes'));
    expect(res.status).toBe(200);
    expect(mockPrisma.mgMasajesFinance.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { date: 'desc' },
    });
  });
});

// ===========================================
// LOCATION FIELD — SCHEMA VALIDATION
// ===========================================

describe('Location field schema validation', () => {
  it('accepts location as optional string', async () => {
    const input = {
      clientName: 'Test', clientPhone: '9999', garmentName: 'Remera',
      repairType: 'diseño', description: 'estampar logo',
      deliveryDate: '2026-05-10', price: 2000, location: null,
    };
    mockPrisma.order.create.mockResolvedValue({ id: 'ORD-V-1', orderNumber: 4, ...input, status: 'recibido', intakeDate: '2026-04-05' });
    const res = await request(app).post('/api/zenco/garments').set('Authorization', authHeader('zenco')).send(input);
    expect(res.status).toBe(200);
  });
});
