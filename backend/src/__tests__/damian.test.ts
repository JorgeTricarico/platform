import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { app } from '../index.js';

const mockPrisma = prisma as unknown as {
  appointment: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  damianFinance: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  client: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
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
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    mockPrisma.appointment.create.mockResolvedValue(created);

    const res = await request(app).post('/api/damian/appointments').send(input);
    expect(res.status).toBe(200);
    expect(res.body.clientName).toBe('Carlos');
    expect(res.body.status).toBe('pendiente');
    expect(mockPrisma.appointment.create).toHaveBeenCalledOnce();
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    mockPrisma.appointment.create.mockRejectedValue(new Error('DB error'));
    const res = await request(app).post('/api/damian/appointments').send({
      clientName: 'Fail', clientPhone: '0000', service: 'X', duration: 30, date: '2026-04-10', time: '10:00', price: 1000,
    });
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
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
    expect(res.body.error).toBeDefined();
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
    expect(res.body.error).toBeDefined();
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
    expect(res.body.error).toBeDefined();
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

// --- VALIDATION ---

describe('Damian validation', () => {
  it('POST /appointments returns 400 when clientName is missing', async () => {
    const res = await request(app).post('/api/damian/appointments').send({
      clientPhone: '1234', service: 'Masaje', duration: 60,
      date: '2026-04-10', time: '10:00', price: 8000,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos invalidos');
  });

  it('POST /appointments returns 400 when duration is not a number', async () => {
    const res = await request(app).post('/api/damian/appointments').send({
      clientName: 'Juan', clientPhone: '1234', service: 'Masaje',
      duration: 'una hora', date: '2026-04-10', time: '10:00', price: 8000,
    });
    expect(res.status).toBe(400);
  });

  it('PUT /appointments/:id/status returns 400 when status is empty', async () => {
    const res = await request(app).put('/api/damian/appointments/APT-1/status').send({});
    expect(res.status).toBe(400);
  });

  it('POST /finances returns 400 when amount is not a number', async () => {
    const res = await request(app).post('/api/damian/finances').send({
      date: '2026-04-05', type: 'income', category: 'Masajes',
      amount: 'mucho', description: 'Test',
    });
    expect(res.status).toBe(400);
  });

  it('POST /clients returns 400 when phone is missing', async () => {
    const res = await request(app).post('/api/damian/clients').send({ name: 'Juan' });
    expect(res.status).toBe(400);
  });

  it('POST /patients/:clientId/records returns 400 when reason is missing', async () => {
    const res = await request(app).post('/api/damian/patients/c1/records').send({ date: '2026-04-05' });
    expect(res.status).toBe(400);
  });
});

// --- DASHBOARD ---

describe('GET /api/damian/dashboard/today', () => {
  it('returns only today\'s appointments sorted by time', async () => {
    const today = new Date().toISOString().split('T')[0];
    const appointments = [
      { id: 'APT-1', clientName: 'Juan', clientPhone: '1111', service: 'Descontracturante', duration: 60, date: today, time: '10:00', status: 'pendiente', price: 8000, notes: null },
      { id: 'APT-2', clientName: 'Laura', clientPhone: '2222', service: 'Relajante', duration: 60, date: today, time: '14:00', status: 'confirmado', price: 7000, notes: null },
    ];
    mockPrisma.appointment.findMany.mockResolvedValue(appointments);
    const res = await request(app).get('/api/damian/dashboard/today');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].time).toBe('10:00');
    expect(res.body[1].time).toBe('14:00');
    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { date: today },
      orderBy: { time: 'asc' },
    }));
  });

  it('returns empty array when no appointments today', async () => {
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/damian/dashboard/today');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.appointment.findMany.mockRejectedValue(new Error('DB error'));
    const res = await request(app).get('/api/damian/dashboard/today');
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /api/damian/dashboard/stale-patients', () => {
  it('returns patients with no records at all', async () => {
    mockPrisma.client.findMany.mockResolvedValue([
      { id: 'c1', name: 'Nuevo Paciente', phone: '1111', business: 'damian', createdAt: new Date().toISOString() },
    ]);
    mockPrisma.patientRecord.findMany
      .mockResolvedValueOnce([]); // no records for c1

    const res = await request(app).get('/api/damian/dashboard/stale-patients');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Nuevo Paciente');
    expect(res.body[0].lastVisit).toBeNull();
  });

  it('returns patients whose last record is older than 30 days', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 45);
    const oldDateStr = oldDate.toISOString().split('T')[0];

    mockPrisma.client.findMany.mockResolvedValue([
      { id: 'c1', name: 'Paciente Viejo', phone: '1111', business: 'damian', createdAt: new Date().toISOString() },
    ]);
    mockPrisma.patientRecord.findMany
      .mockResolvedValueOnce([{ id: 'rec-1', clientId: 'c1', date: oldDateStr, reason: 'Cervical' }]);

    const res = await request(app).get('/api/damian/dashboard/stale-patients');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Paciente Viejo');
    expect(res.body[0].lastVisit).toBe(oldDateStr);
    expect(res.body[0].lastReason).toBe('Cervical');
  });

  it('excludes patients with recent records', async () => {
    const recentDate = new Date().toISOString().split('T')[0];

    mockPrisma.client.findMany.mockResolvedValue([
      { id: 'c1', name: 'Paciente Activo', phone: '1111', business: 'damian', createdAt: new Date().toISOString() },
    ]);
    mockPrisma.patientRecord.findMany
      .mockResolvedValueOnce([{ id: 'rec-1', clientId: 'c1', date: recentDate, reason: 'Control' }]);

    const res = await request(app).get('/api/damian/dashboard/stale-patients');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.client.findMany.mockRejectedValue(new Error('DB error'));
    const res = await request(app).get('/api/damian/dashboard/stale-patients');
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /api/damian/dashboard/appointments', () => {
  it('returns upcoming appointments (today and future) excluding cancelled', async () => {
    const today = new Date().toISOString().split('T')[0];
    const appointments = [
      { id: 'APT-1', clientName: 'Juan', clientPhone: '1111', service: 'Descontracturante', duration: 60, date: today, time: '10:00', status: 'pendiente', price: 8000, notes: null },
      { id: 'APT-2', clientName: 'Laura', clientPhone: '2222', service: 'Relajante', duration: 60, date: '2026-04-10', time: '14:00', status: 'confirmado', price: 7000, notes: null },
    ];
    mockPrisma.appointment.findMany.mockResolvedValue(appointments);
    const res = await request(app).get('/api/damian/dashboard/appointments');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        date: { gte: today },
        status: { not: 'cancelado' },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    }));
  });

  it('returns empty array when no upcoming appointments', async () => {
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/damian/dashboard/appointments');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.appointment.findMany.mockRejectedValue(new Error('DB error'));
    const res = await request(app).get('/api/damian/dashboard/appointments');
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

describe('PUT /api/damian/clients/:id', () => {
  it('updates client fields by id', async () => {
    const updated = { id: 'c1', name: 'Juan Updated', phone: '5678', business: 'damian' };
    mockPrisma.client.update.mockResolvedValue(updated);
    const res = await request(app).put('/api/damian/clients/c1').send({ name: 'Juan Updated' });
    expect(res.status).toBe(200);
    expect(mockPrisma.client.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: expect.objectContaining({ name: 'Juan Updated' })
    });
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.client.update.mockRejectedValue(new Error('DB error'));
    const res = await request(app).put('/api/damian/clients/c1').send({ name: 'Test' });
    expect(res.status).toBe(500);
  });
});

// --- D18: FULL APPOINTMENT EDIT ---

describe('PUT /api/damian/appointments/:id', () => {
  const fullAppointment = {
    clientName: 'Juan', clientPhone: '1111', service: 'Masaje descontracturante',
    duration: 60, date: '2026-04-10', time: '10:00', price: 8000,
  };

  it('updates appointment fully', async () => {
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    const updated = { id: 'APT-1', ...fullAppointment, status: 'pendiente' };
    mockPrisma.appointment.update.mockResolvedValue(updated);

    const res = await request(app).put('/api/damian/appointments/APT-1').send(fullAppointment);
    expect(res.status).toBe(200);
    expect(res.body.clientName).toBe('Juan');
    expect(mockPrisma.appointment.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'APT-1' },
    }));
  });

  it('returns 409 when time conflicts with existing appointment', async () => {
    // Existing: 10:00 duration 60 → ends 11:00. New: 10:30 duration 60 → ends 11:30 → overlaps
    mockPrisma.appointment.findMany.mockResolvedValue([
      { id: 'APT-OTHER', clientName: 'Laura', time: '10:00', duration: 60, date: '2026-04-10', status: 'pendiente' },
    ]);

    const res = await request(app).put('/api/damian/appointments/APT-1').send({
      ...fullAppointment, time: '10:30', duration: 60,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Conflicto de horario');
    expect(res.body.conflictWith).toBe('APT-OTHER');
  });

  it('allows update when only conflict is with self', async () => {
    // findMany returns the SAME id being updated — should be excluded from conflict check
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    mockPrisma.appointment.update.mockResolvedValue({ id: 'APT-1', ...fullAppointment, status: 'pendiente' });

    const res = await request(app).put('/api/damian/appointments/APT-1').send(fullAppointment);
    expect(res.status).toBe(200);
  });

  it('returns 500 when prisma throws on update', async () => {
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    mockPrisma.appointment.update.mockRejectedValue(new Error('DB error'));

    const res = await request(app).put('/api/damian/appointments/APT-1').send(fullAppointment);
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

// --- D19: EDIT/DELETE FINANCES ---

describe('PUT /api/damian/finances/:id', () => {
  it('updates a finance entry', async () => {
    const updated = { id: 'f1', date: '2026-04-01', type: 'ingreso', category: 'Masajes', amount: 5000, description: 'Sesion Juan' };
    mockPrisma.damianFinance.update.mockResolvedValue(updated);
    const res = await request(app).put('/api/damian/finances/f1').send({ amount: 5000, description: 'Sesion Juan' });
    expect(res.status).toBe(200);
    expect(mockPrisma.damianFinance.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'f1' }
    }));
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.damianFinance.update.mockRejectedValue(new Error('DB error'));
    const res = await request(app).put('/api/damian/finances/f1').send({ amount: 5000 });
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/damian/finances/:id', () => {
  it('deletes a finance entry', async () => {
    mockPrisma.damianFinance.delete.mockResolvedValue({});
    const res = await request(app).delete('/api/damian/finances/f1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('returns 500 when prisma throws', async () => {
    mockPrisma.damianFinance.delete.mockRejectedValue(new Error('DB error'));
    const res = await request(app).delete('/api/damian/finances/f1');
    expect(res.status).toBe(500);
  });
});

// --- D20: CONFLICT DETECTION ON POST ---

describe('POST /api/damian/appointments - conflict detection', () => {
  const newAppointment = {
    clientName: 'Carlos', clientPhone: '3333', service: 'Masaje deportivo',
    duration: 60, date: '2026-04-10', time: '10:30', price: 9000,
  };

  it('returns 409 when new appointment conflicts with existing', async () => {
    // Existing: 10:00 duration 60 → ends 11:00. New: 10:30 → starts before 11:00 → conflict
    mockPrisma.appointment.findMany.mockResolvedValue([
      { id: 'APT-EXIST', clientName: 'Juan', time: '10:00', duration: 60, date: '2026-04-10', status: 'pendiente' },
    ]);

    const res = await request(app).post('/api/damian/appointments').send(newAppointment);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Conflicto de horario');
    expect(res.body.conflictWith).toBe('APT-EXIST');
  });

  it('creates appointment when no conflict', async () => {
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    const created = { id: 'APT-NEW', ...newAppointment, status: 'pendiente' };
    mockPrisma.appointment.create.mockResolvedValue(created);

    const res = await request(app).post('/api/damian/appointments').send(newAppointment);
    expect(res.status).toBe(200);
    expect(res.body.clientName).toBe('Carlos');
    expect(mockPrisma.appointment.create).toHaveBeenCalledOnce();
  });
});
