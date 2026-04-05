import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { app } from '../index.js';

const mockPrisma = prisma as unknown as {
  client: { findUnique: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
  appointment: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
};

// Mock Gemini SDK with tool-calling support
const mockSendMessage = vi.fn();
const mockStartChat = vi.fn(() => ({ sendMessage: mockSendMessage }));

vi.mock('@google/generative-ai', () => {
  class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return {
        startChat: mockStartChat,
        generateContent: vi.fn(),
      };
    }
  }
  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
    SchemaType: { OBJECT: 'OBJECT', STRING: 'STRING' },
  };
});

// Helper to create a simple text response (no function calls)
function textResponse(text: string) {
  return {
    response: {
      text: () => text,
      functionCalls: () => null,
    },
  };
}

// Helper to create a function call response
function functionCallResponse(name: string, args: Record<string, string>) {
  return {
    response: {
      text: () => { throw new Error('No text when function call'); },
      functionCalls: () => [{ name, args }],
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GEMINI_API_KEY = 'test-key';
  mockSendMessage.mockResolvedValue(textResponse('hola! como andas?'));
});

// --- CONVERSATION TESTS ---

describe('POST /api/damian/chat — Conversación ida y vuelta', () => {
  it('returns 400 when message is empty', async () => {
    const res = await request(app).post('/api/damian/chat').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Mensaje requerido');
  });

  it('returns fallback when no API key', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await request(app).post('/api/damian/chat').send({ message: 'Hola' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('no esta configurado');
  });

  it('Saludo: cliente saluda, Damian responde casual', async () => {
    mockSendMessage.mockResolvedValue(textResponse('hola! como andas? en que te puedo ayudar?'));

    const res = await request(app).post('/api/damian/chat').send({ message: 'Buenas!' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('hola');
    expect(mockSendMessage).toHaveBeenCalledWith('Buenas!');
  });

  it('Consulta servicios: cliente pregunta qué masajes ofrece', async () => {
    mockSendMessage.mockResolvedValue(textResponse(
      'hago descontracturante, relajante, deportivo y drenaje linfatico. cual te interesa?'
    ));

    const res = await request(app).post('/api/damian/chat').send({
      message: '¿Qué tipos de masaje hacés?',
    });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBeTruthy();
  });

  it('Agendar turno: bot usa book_appointment tool', async () => {
    // First call: AI decides to call book_appointment
    mockSendMessage
      .mockResolvedValueOnce(functionCallResponse('book_appointment', {
        clientName: 'Laura',
        service: 'descontracturante',
        date: '2026-04-07',
        time: '15:00',
      }))
      // Second call: after function result, AI responds with confirmation
      .mockResolvedValueOnce(textResponse(
        'listo laura! te agendé un descontracturante el lunes 7 a las 15hs. te espero!'
      ));

    mockPrisma.appointment.create.mockResolvedValue({
      id: 'APT-123', clientName: 'Laura', service: 'Masaje Descontracturante',
      date: '2026-04-07', time: '15:00', price: 8000, status: 'pendiente',
    });

    const res = await request(app).post('/api/damian/chat').send({
      message: 'Quiero un turno para descontracturante el lunes 7 a las 3 de la tarde, soy Laura',
    });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('laura');
    // Verify appointment was created
    expect(mockPrisma.appointment.create).toHaveBeenCalledOnce();
    const createData = mockPrisma.appointment.create.mock.calls[0][0].data;
    expect(createData.service).toBe('Masaje Descontracturante');
    expect(createData.date).toBe('2026-04-07');
    expect(createData.time).toBe('15:00');
    expect(createData.status).toBe('pendiente');
  });

  it('Consultar disponibilidad: bot usa check_appointments tool', async () => {
    mockSendMessage
      .mockResolvedValueOnce(functionCallResponse('check_appointments', {
        date: '2026-04-07',
      }))
      .mockResolvedValueOnce(textResponse(
        'el lunes 7 tengo ocupados los turnos de 10 y 14hs. el resto esta libre, que horario te queda bien?'
      ));

    mockPrisma.appointment.findMany.mockResolvedValue([
      { time: '10:00', status: 'pendiente' },
      { time: '14:00', status: 'pendiente' },
    ]);

    const res = await request(app).post('/api/damian/chat').send({
      message: '¿Qué turnos tenés libres el lunes 7?',
    });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBeTruthy();
    // Verify appointments were checked
    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: '2026-04-07', status: { not: 'cancelado' } },
      })
    );
  });

  it('Buscar cliente: bot usa lookup_client tool', async () => {
    mockSendMessage
      .mockResolvedValueOnce(functionCallResponse('lookup_client', {
        phone: '1111',
      }))
      .mockResolvedValueOnce(textResponse(
        'encontre a carlos! tiene 2 turnos anteriores. queres agendar otro?'
      ));

    mockPrisma.client.findUnique
      .mockResolvedValueOnce(null)  // pre-lookup for senderPhone (not provided)
      .mockResolvedValueOnce({     // lookup_client tool call
        id: 'c1', name: 'Carlos', phone: '1111', business: 'damian', notes: 'le gusta descontracturante',
      });
    mockPrisma.appointment.findMany.mockResolvedValue([
      { service: 'Masaje Descontracturante', date: '2026-03-20', time: '16:00', status: 'completado' },
      { service: 'Masaje Relajante', date: '2026-03-27', time: '10:00', status: 'completado' },
    ]);

    const res = await request(app).post('/api/damian/chat').send({
      message: 'Buscame el historial del 1111',
    });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('carlos');
  });

  it('Cliente identificado por senderPhone: bot lo saluda por nombre', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'c2', name: 'Pedro', phone: '5555', business: 'damian', notes: 'dolor de espalda',
    });
    mockSendMessage.mockResolvedValue(textResponse('pedro! como andas? necesitas otro turno?'));

    const res = await request(app).post('/api/damian/chat').send({
      message: 'Hola Damian!',
      senderPhone: '5555',
    });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('pedro');
    // Verify system instruction included client hint
    expect(mockStartChat).toHaveBeenCalledWith(expect.objectContaining({
      history: [],
    }));
  });

  it('Respeta history para conversaciones multi-turno', async () => {
    const history = [
      { role: 'user', parts: [{ text: 'Hola' }] },
      { role: 'model', parts: [{ text: 'hola! como andas?' }] },
    ];
    mockSendMessage.mockResolvedValue(textResponse('dale, que dia te queda bien?'));

    const res = await request(app).post('/api/damian/chat').send({
      message: 'Quiero un turno',
      history,
    });

    expect(res.status).toBe(200);
    expect(mockStartChat).toHaveBeenCalledWith(expect.objectContaining({
      history,
    }));
  });

  it('Auto-registra cliente nuevo con senderPhone desconocido', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null);
    mockPrisma.client.upsert.mockResolvedValue({});

    await request(app).post('/api/damian/chat').send({
      message: 'Hola',
      senderPhone: '8888',
    });

    expect(mockPrisma.client.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phone_business: { phone: '8888', business: 'damian' } },
        create: expect.objectContaining({ phone: '8888', business: 'damian' }),
      })
    );
  });

  it('Graceful fallback on Gemini error', async () => {
    mockSendMessage.mockRejectedValue(new Error('Gemini down'));
    const res = await request(app).post('/api/damian/chat').send({ message: 'Hola' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('sesion');
  });
});
