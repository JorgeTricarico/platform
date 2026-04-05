import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { app } from '../index.js';

const mockPrisma = prisma as unknown as {
  appointment: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  damianFinance: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  client: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  patientRecord: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
});

// --- APPOINTMENTS CRUD ---

describe('GET /api/damian/appointments', () => {
  it('returns empty array when no appointments', async () => {
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/damian/appointments');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns appointments sorted by date', async () => {
    const appointments = [
      { id: 'APT-1', clientName: 'Juan', clientPhone: '1111', service: 'Masaje descontracturante', duration: 60, date: '2026-04-05', time: '10:00', status: 'pendiente', price: 8000, notes: null },
      { id: 'APT-2', clientName: 'Laura', clientPhone: '2222', service: 'Reflexologia', duration: 45, date: '2026-04-06', time: '14:00', status: 'confirmado', price: 6000, notes: 'Primera vez' },
    ];
    mockPrisma.appointment.findMany.mockResolvedValue(appointments);
    const res = await request(app).get('/api/damian/appointments');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].clientName).toBe('Juan');
  });
});

describe('POST /api/damian/appointments', () => {
  it('creates an appointment with all required fields', async () => {
    const input = {
      clientName: 'Carlos', clientPhone: '3333', service: 'Masaje deportivo',
      duration: 60, date: '2026-04-10', time: '16:00', price: 9000, notes: 'Dolor lumbar',
    };
    const created = { id: 'APT-123', ...input, status: 'pendiente', createdAt: new Date().toISOString() };
    mockPrisma.appointment.create.mockResolvedValue(created);

    const res = await request(app).post('/api/damian/appointments').send(input);
    expect(res.status).toBe(200);
    expect(res.body.clientName).toBe('Carlos');
    expect(res.body.status).toBe('pendiente');
    expect(mockPrisma.appointment.create).toHaveBeenCalledOnce();
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.appointment.create.mockRejectedValue(new Error('DB error'));
    const res = await request(app).post('/api/damian/appointments').send({
      clientName: 'Fail', clientPhone: '0000', service: 'X', duration: 30, date: '2026-04-10', time: '10:00', price: 1000,
    });
    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Error');
  });
});

describe('PUT /api/damian/appointments/:id/status', () => {
  it('updates appointment status', async () => {
    mockPrisma.appointment.update.mockResolvedValue({ id: 'APT-1', status: 'completado' });
    const res = await request(app).put('/api/damian/appointments/APT-1/status').send({ status: 'completado' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completado');
  });

  it('returns 500 on invalid id', async () => {
    mockPrisma.appointment.update.mockRejectedValue(new Error('Not found'));
    const res = await request(app).put('/api/damian/appointments/FAKE/status').send({ status: 'completado' });
    expect(res.status).toBe(500);
  });
});

// --- FINANCES DAMIAN ---

describe('GET /api/damian/finances', () => {
  it('returns finances list', async () => {
    mockPrisma.damianFinance.findMany.mockResolvedValue([
      { id: 'FIN-D-1', date: '2026-04-01', type: 'income', category: 'Masajes', amount: 8000, description: 'Sesion Juan' },
    ]);
    const res = await request(app).get('/api/damian/finances');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].category).toBe('Masajes');
  });

  it('returns empty array when no finances', async () => {
    mockPrisma.damianFinance.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/damian/finances');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/damian/finances', () => {
  it('creates a finance entry', async () => {
    const input = { date: '2026-04-05', type: 'expense', category: 'Aceites', amount: 3500, description: 'Aceite de almendras' };
    mockPrisma.damianFinance.create.mockResolvedValue({ id: 'FIN-D-123', ...input });
    const res = await request(app).post('/api/damian/finances').send(input);
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('Aceites');
    expect(res.body.amount).toBe(3500);
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.damianFinance.create.mockRejectedValue(new Error('DB error'));
    const res = await request(app).post('/api/damian/finances').send({
      date: '2026-04-05', type: 'income', category: 'X', amount: 100, description: 'test',
    });
    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Error');
  });
});

// --- CLIENTS DAMIAN ---

describe('GET /api/damian/clients', () => {
  it('returns only damian clients', async () => {
    mockPrisma.client.findMany.mockResolvedValue([
      { id: 'c1', name: 'Juan Perez', phone: '1111', business: 'damian', createdAt: new Date().toISOString() },
    ]);
    const res = await request(app).get('/api/damian/clients');
    expect(res.status).toBe(200);
    expect(res.body[0].business).toBe('damian');
    expect(mockPrisma.client.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { business: 'damian' },
    }));
  });
});

describe('POST /api/damian/clients', () => {
  it('upserts a client by phone+business', async () => {
    const input = { name: 'Laura Garcia', phone: '4444', email: 'laura@test.com', notes: 'Contractura cronica' };
    mockPrisma.client.upsert.mockResolvedValue({ id: 'uuid-1', ...input, business: 'damian' });
    const res = await request(app).post('/api/damian/clients').send(input);
    expect(res.status).toBe(200);
    expect(mockPrisma.client.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { phone_business: { phone: '4444', business: 'damian' } },
    }));
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.client.upsert.mockRejectedValue(new Error('DB error'));
    const res = await request(app).post('/api/damian/clients').send({ name: 'Fail', phone: '0000' });
    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Error');
  });
});

describe('GET /api/damian/clients/search', () => {
  it('searches clients by name', async () => {
    mockPrisma.client.findMany.mockResolvedValue([
      { id: 'c1', name: 'Laura Garcia', phone: '4444', business: 'damian' },
    ]);
    const res = await request(app).get('/api/damian/clients/search?q=laura');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Laura Garcia');
  });

  it('searches clients by phone', async () => {
    mockPrisma.client.findMany.mockResolvedValue([
      { id: 'c2', name: 'Pedro', phone: '5555', business: 'damian' },
    ]);
    const res = await request(app).get('/api/damian/clients/search?q=5555');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('returns empty for no matches', async () => {
    mockPrisma.client.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/damian/clients/search?q=nonexistent');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// --- PATIENT RECORDS (FICHAS CLINICAS) ---

describe('GET /api/damian/patients/:clientId/records', () => {
  it('returns records for a patient', async () => {
    const records = [
      { id: 'rec-1', clientId: 'c1', date: '2026-04-01', reason: 'Dolor cervical', symptoms: 'Tension', areas: 'Cervical, trapecio', treatment: 'Masaje descontracturante', observations: 'Mejoria', nextSession: 'En 1 semana' },
    ];
    mockPrisma.patientRecord.findMany.mockResolvedValue(records);
    const res = await request(app).get('/api/damian/patients/c1/records');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].reason).toBe('Dolor cervical');
  });

  it('returns empty for patient with no records', async () => {
    mockPrisma.patientRecord.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/damian/patients/c1/records');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/damian/patients/:clientId/records', () => {
  it('creates a patient record', async () => {
    const input = {
      date: '2026-04-05', reason: 'Lumbalgia', symptoms: 'Dolor zona baja',
      areas: 'Lumbar, gluteo', treatment: 'Masaje profundo', observations: 'Contractura severa',
      nextSession: 'Control en 5 dias',
    };
    const created = { id: 'rec-new', clientId: 'c1', ...input, createdAt: new Date().toISOString() };
    mockPrisma.patientRecord.create.mockResolvedValue(created);

    const res = await request(app).post('/api/damian/patients/c1/records').send(input);
    expect(res.status).toBe(200);
    expect(res.body.reason).toBe('Lumbalgia');
    expect(res.body.clientId).toBe('c1');
    expect(mockPrisma.patientRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ clientId: 'c1', reason: 'Lumbalgia' }),
    });
  });

  it('creates record with minimal fields', async () => {
    const input = { date: '2026-04-05', reason: 'Control' };
    mockPrisma.patientRecord.create.mockResolvedValue({ id: 'rec-min', clientId: 'c1', ...input });

    const res = await request(app).post('/api/damian/patients/c1/records').send(input);
    expect(res.status).toBe(200);
    expect(res.body.reason).toBe('Control');
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.patientRecord.create.mockRejectedValue(new Error('DB error'));
    const res = await request(app).post('/api/damian/patients/c1/records').send({
      date: '2026-04-05', reason: 'Test',
    });
    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Error');
  });
});

describe('PUT /api/damian/patients/records/:id', () => {
  it('updates a patient record', async () => {
    const update = {
      reason: 'Lumbalgia (seguimiento)', symptoms: 'Mejoria parcial',
      areas: 'Lumbar', treatment: 'Masaje suave', observations: 'Menos tension',
      nextSession: 'En 2 semanas',
    };
    mockPrisma.patientRecord.update.mockResolvedValue({ id: 'rec-1', clientId: 'c1', date: '2026-04-01', ...update });
    const res = await request(app).put('/api/damian/patients/records/rec-1').send(update);
    expect(res.status).toBe(200);
    expect(res.body.reason).toBe('Lumbalgia (seguimiento)');
  });

  it('returns 500 on invalid id', async () => {
    mockPrisma.patientRecord.update.mockRejectedValue(new Error('Not found'));
    const res = await request(app).put('/api/damian/patients/records/FAKE').send({ reason: 'X' });
    expect(res.status).toBe(500);
  });
});

// --- PATIENTS LIST (with record counts) ---

describe('GET /api/damian/patients', () => {
  it('returns patients with record counts and last visit', async () => {
    mockPrisma.client.findMany.mockResolvedValue([
      { id: 'c1', name: 'Juan Perez', phone: '1111', business: 'damian', notes: null, createdAt: new Date().toISOString() },
    ]);
    mockPrisma.patientRecord.findMany.mockResolvedValue([
      { id: 'rec-1', clientId: 'c1', date: '2026-04-01', reason: 'Cervical' },
    ]);
    mockPrisma.patientRecord.count.mockResolvedValue(3);

    const res = await request(app).get('/api/damian/patients');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].totalRecords).toBe(3);
    expect(res.body[0].lastVisit).toBe('2026-04-01');
    expect(res.body[0].lastReason).toBe('Cervical');
  });

  it('returns patient with no records', async () => {
    mockPrisma.client.findMany.mockResolvedValue([
      { id: 'c2', name: 'Nuevo Paciente', phone: '9999', business: 'damian', notes: null, createdAt: new Date().toISOString() },
    ]);
    mockPrisma.patientRecord.findMany.mockResolvedValue([]);
    mockPrisma.patientRecord.count.mockResolvedValue(0);

    const res = await request(app).get('/api/damian/patients');
    expect(res.status).toBe(200);
    expect(res.body[0].totalRecords).toBe(0);
    expect(res.body[0].lastVisit).toBeNull();
    expect(res.body[0].lastReason).toBeNull();
  });
});
