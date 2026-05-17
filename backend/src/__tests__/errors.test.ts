import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { app } from '../index.js';
import { authHeader } from './setup.js';
import { _resetRateLimitForTests } from '../routes/errors.js';

const mockPrisma = prisma as unknown as {
  errorLog: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  _resetRateLimitForTests();
});

// ============================================================
// POST /api/errors  (público, sin auth)
// ============================================================

describe('POST /api/errors', () => {
  it('persiste error con campos minimos (source, level, message)', async () => {
    mockPrisma.errorLog.create.mockResolvedValue({
      id: 'err-1',
      source: 'frontend',
      level: 'error',
      message: 'algo se rompio',
    });

    const res = await request(app)
      .post('/api/errors')
      .send({ source: 'frontend', level: 'error', message: 'algo se rompio' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('err-1');
    expect(mockPrisma.errorLog.create).toHaveBeenCalledOnce();
    const data = mockPrisma.errorLog.create.mock.calls[0][0].data;
    expect(data.source).toBe('frontend');
    expect(data.level).toBe('error');
    expect(data.message).toBe('algo se rompio');
  });

  it('no requiere auth (sin token, devuelve 201)', async () => {
    mockPrisma.errorLog.create.mockResolvedValue({ id: 'err-2' });

    const res = await request(app)
      .post('/api/errors')
      .send({ source: 'frontend', level: 'error', message: 'sin auth' });

    expect(res.status).toBe(201);
  });

  it('persiste campos opcionales: business, stack, url, userAgent, userName, metadata', async () => {
    mockPrisma.errorLog.create.mockResolvedValue({ id: 'err-3' });

    await request(app)
      .post('/api/errors')
      .send({
        source: 'frontend',
        level: 'warning',
        message: 'algo raro',
        business: 'zenco',
        stack: 'Error: x\n  at foo (bar.ts:10:5)',
        url: 'https://zenko-app.onrender.com/dashboard',
        userAgent: 'Mozilla/5.0',
        userName: 'Ana',
        metadata: { foo: 'bar', count: 3 },
      });

    const data = mockPrisma.errorLog.create.mock.calls[0][0].data;
    expect(data.business).toBe('zenco');
    expect(data.stack).toContain('Error: x');
    expect(data.url).toBe('https://zenko-app.onrender.com/dashboard');
    expect(data.userAgent).toBe('Mozilla/5.0');
    expect(data.userName).toBe('Ana');
    expect(data.metadata).toEqual({ foo: 'bar', count: 3 });
  });

  it('trunca message > 1000 chars silenciosamente', async () => {
    mockPrisma.errorLog.create.mockResolvedValue({ id: 'err-4' });
    const longMsg = 'x'.repeat(2000);

    const res = await request(app)
      .post('/api/errors')
      .send({ source: 'frontend', level: 'error', message: longMsg });

    expect(res.status).toBe(201);
    const data = mockPrisma.errorLog.create.mock.calls[0][0].data;
    expect(data.message.length).toBe(1000);
  });

  it('trunca stack > 5000 chars silenciosamente', async () => {
    mockPrisma.errorLog.create.mockResolvedValue({ id: 'err-5' });
    const longStack = 'a'.repeat(10000);

    const res = await request(app)
      .post('/api/errors')
      .send({ source: 'frontend', level: 'error', message: 'corto', stack: longStack });

    expect(res.status).toBe(201);
    const data = mockPrisma.errorLog.create.mock.calls[0][0].data;
    expect(data.stack.length).toBe(5000);
  });

  it('trunca url > 500 chars', async () => {
    mockPrisma.errorLog.create.mockResolvedValue({ id: 'err-url' });
    const longUrl = 'https://example.com/' + 'x'.repeat(1000);

    await request(app)
      .post('/api/errors')
      .send({ source: 'frontend', level: 'error', message: 'm', url: longUrl });

    const data = mockPrisma.errorLog.create.mock.calls[0][0].data;
    expect(data.url.length).toBe(500);
  });

  it('trunca userAgent > 500 chars', async () => {
    mockPrisma.errorLog.create.mockResolvedValue({ id: 'err-ua' });
    const longUa = 'u'.repeat(2000);

    await request(app)
      .post('/api/errors')
      .send({ source: 'frontend', level: 'error', message: 'm', userAgent: longUa });

    const data = mockPrisma.errorLog.create.mock.calls[0][0].data;
    expect(data.userAgent.length).toBe(500);
  });

  it('400 si falta source', async () => {
    const res = await request(app)
      .post('/api/errors')
      .send({ level: 'error', message: 'sin source' });

    expect(res.status).toBe(400);
    expect(mockPrisma.errorLog.create).not.toHaveBeenCalled();
  });

  it('400 si falta level', async () => {
    const res = await request(app)
      .post('/api/errors')
      .send({ source: 'frontend', message: 'sin level' });

    expect(res.status).toBe(400);
  });

  it('400 si falta message', async () => {
    const res = await request(app)
      .post('/api/errors')
      .send({ source: 'frontend', level: 'error' });

    expect(res.status).toBe(400);
  });

  it('400 si source es invalido (enum)', async () => {
    const res = await request(app)
      .post('/api/errors')
      .send({ source: 'mobile', level: 'error', message: 'm' });

    expect(res.status).toBe(400);
  });

  it('400 si level es invalido (enum)', async () => {
    const res = await request(app)
      .post('/api/errors')
      .send({ source: 'frontend', level: 'fatal', message: 'm' });

    expect(res.status).toBe(400);
  });

  it('rate limit: 429 despues de 50 requests/min de la misma IP', async () => {
    mockPrisma.errorLog.create.mockResolvedValue({ id: 'err-rate' });

    // Las primeras 50 deben pasar (201)
    for (let i = 0; i < 50; i++) {
      const r = await request(app)
        .post('/api/errors')
        .set('X-Forwarded-For', '203.0.113.99')
        .send({ source: 'frontend', level: 'error', message: `m${i}` });
      expect(r.status).toBe(201);
    }

    // La 51 debe ser rechazada
    const res = await request(app)
      .post('/api/errors')
      .set('X-Forwarded-For', '203.0.113.99')
      .send({ source: 'frontend', level: 'error', message: 'overflow' });

    expect(res.status).toBe(429);
  });
});

// ============================================================
// GET /api/errors  (con auth)
// ============================================================

describe('GET /api/errors', () => {
  it('requiere auth (401 sin token)', async () => {
    const res = await request(app).get('/api/errors');
    expect(res.status).toBe(401);
  });

  it('lista errores ordenados desc por createdAt', async () => {
    const errors = [
      { id: 'e2', source: 'frontend', level: 'error', message: 'newer', createdAt: '2026-05-17T10:00:00Z', resolved: false },
      { id: 'e1', source: 'frontend', level: 'warning', message: 'older', createdAt: '2026-05-16T10:00:00Z', resolved: false },
    ];
    mockPrisma.errorLog.findMany.mockResolvedValue(errors);

    const res = await request(app).get('/api/errors').set('Authorization', authHeader('zenco'));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(mockPrisma.errorLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });

  it('filtra por business', async () => {
    mockPrisma.errorLog.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/errors?business=zenco')
      .set('Authorization', authHeader('zenco'));

    const call = mockPrisma.errorLog.findMany.mock.calls[0][0];
    expect(call.where.business).toBe('zenco');
  });

  it('filtra por resolved', async () => {
    mockPrisma.errorLog.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/errors?resolved=false')
      .set('Authorization', authHeader('zenco'));

    const call = mockPrisma.errorLog.findMany.mock.calls[0][0];
    expect(call.where.resolved).toBe(false);
  });

  it('filtra por source', async () => {
    mockPrisma.errorLog.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/errors?source=frontend')
      .set('Authorization', authHeader('zenco'));

    const call = mockPrisma.errorLog.findMany.mock.calls[0][0];
    expect(call.where.source).toBe('frontend');
  });

  it('paginacion con limit/offset', async () => {
    mockPrisma.errorLog.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/errors?limit=25&offset=50')
      .set('Authorization', authHeader('zenco'));

    const call = mockPrisma.errorLog.findMany.mock.calls[0][0];
    expect(call.take).toBe(25);
    expect(call.skip).toBe(50);
  });

  it('limit max 200 (recorta si pasa)', async () => {
    mockPrisma.errorLog.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/errors?limit=500')
      .set('Authorization', authHeader('zenco'));

    const call = mockPrisma.errorLog.findMany.mock.calls[0][0];
    expect(call.take).toBe(200);
  });

  it('limit default 50 si no se pasa', async () => {
    mockPrisma.errorLog.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/errors')
      .set('Authorization', authHeader('zenco'));

    const call = mockPrisma.errorLog.findMany.mock.calls[0][0];
    expect(call.take).toBe(50);
  });
});

// ============================================================
// PATCH /api/errors/:id
// ============================================================

describe('PATCH /api/errors/:id', () => {
  it('requiere auth (401 sin token)', async () => {
    const res = await request(app).patch('/api/errors/err-1').send({ resolved: true });
    expect(res.status).toBe(401);
  });

  it('marca como resolved', async () => {
    mockPrisma.errorLog.findUnique.mockResolvedValue({ id: 'err-1', resolved: false });
    mockPrisma.errorLog.update.mockResolvedValue({ id: 'err-1', resolved: true });

    const res = await request(app)
      .patch('/api/errors/err-1')
      .set('Authorization', authHeader('zenco'))
      .send({ resolved: true });

    expect(res.status).toBe(200);
    expect(res.body.resolved).toBe(true);
    expect(mockPrisma.errorLog.update).toHaveBeenCalledWith({
      where: { id: 'err-1' },
      data: { resolved: true },
    });
  });

  it('toggle: puede des-resolver', async () => {
    mockPrisma.errorLog.findUnique.mockResolvedValue({ id: 'err-1', resolved: true });
    mockPrisma.errorLog.update.mockResolvedValue({ id: 'err-1', resolved: false });

    const res = await request(app)
      .patch('/api/errors/err-1')
      .set('Authorization', authHeader('zenco'))
      .send({ resolved: false });

    expect(res.status).toBe(200);
    expect(res.body.resolved).toBe(false);
  });

  it('404 si no existe', async () => {
    mockPrisma.errorLog.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/errors/NO-EXISTE')
      .set('Authorization', authHeader('zenco'))
      .send({ resolved: true });

    expect(res.status).toBe(404);
  });

  it('400 si body no tiene resolved boolean', async () => {
    mockPrisma.errorLog.findUnique.mockResolvedValue({ id: 'err-1', resolved: false });

    const res = await request(app)
      .patch('/api/errors/err-1')
      .set('Authorization', authHeader('zenco'))
      .send({ resolved: 'sure' });

    expect(res.status).toBe(400);
  });
});
