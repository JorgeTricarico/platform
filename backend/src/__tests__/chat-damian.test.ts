import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { app } from '../index.js';
import { authHeader } from './setup.js';

const mockPrisma = prisma as unknown as {
  client: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
  appointment: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
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

function textResponse(text: string) {
  return {
    response: {
      text: () => text,
      functionCalls: () => null,
    },
  };
}

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

describe('POST /api/damian/chat — Conversación con contexto pre-cargado', () => {
  it('returns 400 when message is empty', async () => {
    const res = await request(app).post('/api/damian/chat').set('Authorization', authHeader('damian')).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Mensaje requerido');
  });

  it('returns fallback when no API key', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await request(app).post('/api/damian/chat').set('Authorization', authHeader('damian')).send({ message: 'Hola' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('no esta configurado');
  });

  it('Saludo: cliente saluda, Damian responde casual', async () => {
    mockSendMessage.mockResolvedValue(textResponse('hola! como andas? en que te puedo ayudar?'));

    const res = await request(app).post('/api/damian/chat').set('Authorization', authHeader('damian')).send({ message: 'Buenas!' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('hola');
    expect(mockSendMessage).toHaveBeenCalledWith('Buenas!');
  });

  it('Agendar turno: bot usa book_appointment tool', async () => {
    mockSendMessage
      .mockResolvedValueOnce(functionCallResponse('book_appointment', {
        clientName: 'Laura',
        service: 'descontracturante',
        date: '2026-04-07',
        time: '15:00',
      }))
      .mockResolvedValueOnce(textResponse(
        'listo laura! te agendé un descontracturante el lunes 7 a las 15hs. te espero!'
      ));

    mockPrisma.appointment.create.mockResolvedValue({
      id: 'APT-123', clientName: 'Laura', service: 'Masaje Descontracturante',
      date: '2026-04-07', time: '15:00', price: 8000, status: 'pendiente',
    });

    const res = await request(app)
      .post('/api/damian/chat')
      .set('Authorization', authHeader('damian'))
      .send({
        message: 'Quiero un turno para descontracturante el lunes 7 a las 3 de la tarde, soy Laura',
      });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('laura');
    expect(mockPrisma.appointment.create).toHaveBeenCalledOnce();
    const createData = mockPrisma.appointment.create.mock.calls[0][0].data;
    expect(createData.service).toBe('Masaje Descontracturante');
    expect(createData.date).toBe('2026-04-07');
    expect(createData.time).toBe('15:00');
    expect(createData.status).toBe('pendiente');
  });

  it('Disponibilidad pre-cargada: buildContext trae agenda de hoy y mañana', async () => {
    mockPrisma.appointment.findMany.mockResolvedValue([
      { time: '10:00', clientName: 'Ana', service: 'Masaje Relajante', status: 'pendiente' },
      { time: '14:00', clientName: 'Juan', service: 'Masaje Deportivo', status: 'pendiente' },
    ]);
    mockSendMessage.mockResolvedValue(textResponse(
      'hoy tengo ocupados las 10 y las 14. el resto esta libre, que horario te queda bien?'
    ));

    const res = await request(app)
      .post('/api/damian/chat')
      .set('Authorization', authHeader('damian'))
      .send({ message: '¿Qué turnos tenés libres hoy?' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBeTruthy();
    // buildContext fetches today + tomorrow appointments
    expect(mockPrisma.appointment.findMany).toHaveBeenCalled();
  });

  it('Cliente identificado por senderPhone: pre-carga su info y turnos', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'c2', name: 'Pedro', phone: '5555', business: 'damian', notes: 'dolor de espalda',
    });
    mockPrisma.appointment.findMany.mockResolvedValue([
      { id: 'APT-1', service: 'Masaje Descontracturante', date: '2026-03-20', time: '16:00', status: 'completado' },
    ]);
    mockSendMessage.mockResolvedValue(textResponse('pedro! como andas? necesitas otro turno?'));

    const res = await request(app)
      .post('/api/damian/chat')
      .set('Authorization', authHeader('damian'))
      .send({ message: 'Hola Damian!', senderPhone: '5555' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('pedro');
    expect(mockPrisma.client.findUnique).toHaveBeenCalled();
    // Appointments pre-fetched for client context
    expect(mockPrisma.appointment.findMany).toHaveBeenCalled();
  });

  it('Cancelar turno: bot usa cancel_appointment tool', async () => {
    mockSendMessage
      .mockResolvedValueOnce(functionCallResponse('cancel_appointment', {
        appointmentId: 'APT-456',
      }))
      .mockResolvedValueOnce(textResponse('listo, te cancele el turno del viernes'));

    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'APT-456', service: 'Masaje Relajante', date: '2026-04-11', time: '10:00', status: 'pendiente', clientName: 'Carlos',
    });
    mockPrisma.appointment.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/damian/chat')
      .set('Authorization', authHeader('damian'))
      .send({ message: 'Cancelame el turno APT-456' });

    expect(res.status).toBe(200);
    expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'APT-456' },
        data: { status: 'cancelado' },
      })
    );
  });

  it('Respeta history para conversaciones multi-turno', async () => {
    const history = [
      { role: 'user', parts: [{ text: 'Hola' }] },
      { role: 'model', parts: [{ text: 'hola! como andas?' }] },
    ];
    mockSendMessage.mockResolvedValue(textResponse('dale, que dia te queda bien?'));

    const res = await request(app)
      .post('/api/damian/chat')
      .set('Authorization', authHeader('damian'))
      .send({ message: 'Quiero un turno', history });

    expect(res.status).toBe(200);
    expect(mockStartChat).toHaveBeenCalledWith(expect.objectContaining({ history }));
  });

  it('Auto-registra cliente nuevo con senderPhone desconocido', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null);
    mockPrisma.client.upsert.mockResolvedValue({});

    await request(app)
      .post('/api/damian/chat')
      .set('Authorization', authHeader('damian'))
      .send({ message: 'Hola', senderPhone: '8888' });

    expect(mockPrisma.client.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phone_business: { phone: '8888', business: 'damian' } },
        create: expect.objectContaining({ phone: '8888', business: 'damian' }),
      })
    );
  });

  it('Graceful fallback on Gemini error', async () => {
    mockSendMessage.mockRejectedValue(new Error('Gemini down'));
    const res = await request(app).post('/api/damian/chat').set('Authorization', authHeader('damian')).send({ message: 'Hola' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('sesion');
  });
});
