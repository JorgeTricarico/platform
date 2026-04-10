import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { app } from '../index.js';
import { authHeader } from './setup.js';
import { chatWithFallback } from '../services/ai-chat.js';
import { DAMIAN_CONFIG } from '../config/mg_masajes.js';

vi.mock('../services/ai-chat.js');
const mockChat = chatWithFallback as ReturnType<typeof vi.fn>;

const mockPrisma = prisma as unknown as {
  client: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
  appointment: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  mockChat.mockResolvedValue({ reply: 'hola! como andas?', provider: 'gemini' });
});

describe('POST /api/mg_masajes/chat — Conversación con contexto pre-cargado', () => {
  it('returns 400 when message is empty', async () => {
    const res = await request(app).post('/api/mg_masajes/chat').set('Authorization', authHeader('mg_masajes')).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Mensaje requerido');
  });

  it('Saludo: cliente saluda, Damian responde casual', async () => {
    mockChat.mockResolvedValue({ reply: 'hola! como andas? en que te puedo ayudar?', provider: 'cerebras' });

    const res = await request(app).post('/api/mg_masajes/chat').set('Authorization', authHeader('mg_masajes')).send({ message: 'Buenas!' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('hola');
    expect(mockChat).toHaveBeenCalledWith(expect.objectContaining({ message: 'Buenas!' }));
  });

  it('Pasa tools y onFunctionCall a chatWithFallback', async () => {
    await request(app)
      .post('/api/mg_masajes/chat')
      .set('Authorization', authHeader('mg_masajes'))
      .send({ message: 'Quiero un turno' });

    expect(mockChat).toHaveBeenCalledWith(expect.objectContaining({
      tools: expect.arrayContaining([
        expect.objectContaining({
          functionDeclarations: expect.arrayContaining([
            expect.objectContaining({ name: 'book_appointment' }),
            expect.objectContaining({ name: 'cancel_appointment' }),
          ]),
        }),
      ]),
      onFunctionCall: expect.any(Function),
    }));
  });

  it('onFunctionCall: book_appointment creates appointment', async () => {
    const serviceName = 'Descontracturante Cuello y Espalda';
    const servicePrice = DAMIAN_CONFIG.services[serviceName].price;

    mockPrisma.appointment.create.mockResolvedValue({
      id: 'APT-123', clientName: 'Laura', service: serviceName,
      date: '2026-04-07', time: '15:00', price: servicePrice, status: 'pendiente',
    });

    // Trigger a call and capture onFunctionCall
    await request(app).post('/api/mg_masajes/chat').set('Authorization', authHeader('mg_masajes')).send({ message: 'turno' });

    const onFunctionCall = mockChat.mock.calls[0][0].onFunctionCall;
    const result = await onFunctionCall('book_appointment', {
      clientName: 'Laura', service: 'descontracturante', date: '2026-04-07', time: '15:00',
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.appointment.create).toHaveBeenCalledOnce();
    const data = mockPrisma.appointment.create.mock.calls[0][0].data;
    expect(data.service).toBe('Descontracturante Cuello y Espalda');
    expect(data.status).toBe('pendiente');
  });

  it('onFunctionCall: cancel_appointment cancels appointment', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'APT-456', service: 'Masaje Relajante', date: '2026-04-11', time: '10:00', status: 'pendiente', clientName: 'Carlos',
    });
    mockPrisma.appointment.update.mockResolvedValue({});

    await request(app).post('/api/mg_masajes/chat').set('Authorization', authHeader('mg_masajes')).send({ message: 'cancelar' });

    const onFunctionCall = mockChat.mock.calls[0][0].onFunctionCall;
    const result = await onFunctionCall('cancel_appointment', { appointmentId: 'APT-456' });

    expect(result.success).toBe(true);
    expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'APT-456' }, data: { status: 'cancelado' } })
    );
  });

  it('Pre-carga info del cliente con senderPhone en el contexto', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'c2', name: 'Pedro', phone: '5555', business: 'mg_masajes', notes: 'dolor de espalda',
    });
    mockPrisma.appointment.findMany.mockResolvedValue([]);

    await request(app)
      .post('/api/mg_masajes/chat')
      .set('Authorization', authHeader('mg_masajes'))
      .send({ message: 'Hola!', senderPhone: '5555' });

    expect(mockPrisma.client.findUnique).toHaveBeenCalled();
    expect(mockChat.mock.calls[0][0].systemPrompt).toContain('Pedro');
  });

  it('Pre-carga agenda de hoy y mañana en el contexto', async () => {
    mockPrisma.appointment.findMany.mockResolvedValue([
      { time: '10:00', clientName: 'Ana', service: 'Masaje Relajante', status: 'pendiente' },
    ]);

    await request(app).post('/api/mg_masajes/chat').set('Authorization', authHeader('mg_masajes')).send({ message: 'turnos de hoy?' });

    expect(mockPrisma.appointment.findMany).toHaveBeenCalled();
    expect(mockChat.mock.calls[0][0].systemPrompt).toContain('AGENDA PROXIMOS 7 DIAS');
  });

  it('Respeta history', async () => {
    const history = [
      { role: 'user', parts: [{ text: 'Hola' }] },
      { role: 'model', parts: [{ text: 'hola!' }] },
    ];

    await request(app).post('/api/mg_masajes/chat').set('Authorization', authHeader('mg_masajes')).send({ message: 'Quiero un turno', history });
    expect(mockChat).toHaveBeenCalledWith(expect.objectContaining({ history }));
  });

  it('Auto-registra cliente nuevo con senderPhone', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null);
    mockPrisma.client.upsert.mockResolvedValue({});

    await request(app).post('/api/mg_masajes/chat').set('Authorization', authHeader('mg_masajes')).send({ message: 'Hola', senderPhone: '8888' });

    expect(mockPrisma.client.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phone_business: { phone: '8888', business: 'mg_masajes' } },
        create: expect.objectContaining({ phone: '8888', business: 'mg_masajes' }),
      })
    );
  });

  it('Graceful fallback when all AI providers fail', async () => {
    mockChat.mockRejectedValue(new Error('All AI providers failed'));
    const res = await request(app).post('/api/mg_masajes/chat').set('Authorization', authHeader('mg_masajes')).send({ message: 'Hola' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('error');
  });

  it('Privacy: buildContext does not leak names in availability', async () => {
    // Mock existing appointments for today
    const today = new Date().toISOString().slice(0, 10);
    mockPrisma.appointment.findMany.mockResolvedValue([
      { id: 'APT-1', clientName: 'Perez', time: '18:00', status: 'confirmado' }
    ]);

    const res = await request(app)
      .post('/api/mg_masajes/chat')
      .set('Authorization', authHeader('mg_masajes'))
      .send({ message: 'hay lugar a las 18?' });

    expect(res.status).toBe(200);
    expect(mockChat).toHaveBeenCalled();
    const systemPromptUsed = mockChat.mock.calls[0][0].systemPrompt;
    
    // The name 'Perez' should NOT be in the system prompt context
    expect(systemPromptUsed).not.toContain('Perez');
    // But 'ocupado 18:00' should be there
    expect(systemPromptUsed).toContain('ocupado 18:00');
  });

  it('onFunctionCall: cancel_appointment marks as cancelled', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({ id: 'APT-123', status: 'pendiente' });
    mockPrisma.appointment.update.mockResolvedValue({ id: 'APT-123', status: 'cancelado' });

    const res = await request(app)
      .post('/api/mg_masajes/chat')
      .set('Authorization', authHeader('mg_masajes'))
      .send({ message: 'cancela mi turno APT-123' });

    expect(res.status).toBe(200);
    expect(mockChat).toHaveBeenCalled();
    const onFunctionCall = mockChat.mock.calls[0][0].onFunctionCall;
    const result = await onFunctionCall('cancel_appointment', { appointmentId: 'APT-123' });

    expect(result.success).toBe(true);
    expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
      where: { id: 'APT-123' },
      data: { status: 'cancelado' },
    });
  });
});
