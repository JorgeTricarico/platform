import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { app } from '../index.js';
import { authHeader } from './setup.js';

const mockPrisma = prisma as unknown as {
  client: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
  order: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
};

// Mock Gemini SDK — Zenco uses startChat + sendMessage (no function calling)
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

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GEMINI_API_KEY = 'test-key';
  // Default: order.count returns 0 (used by buildContext stats)
  mockPrisma.order.count.mockResolvedValue(0);
  mockSendMessage.mockResolvedValue({
    response: {
      text: () => 'Hola! Bienvenido a Zenco, ¿en qué te puedo ayudar?',
    },
  });
});

describe('POST /api/zenco/chat — Conversación con contexto pre-cargado', () => {
  it('returns 400 when message is empty', async () => {
    const res = await request(app).post('/api/zenco/chat').set('Authorization', authHeader('zenco')).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Mensaje requerido');
  });

  it('returns fallback when no API key', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await request(app).post('/api/zenco/chat').set('Authorization', authHeader('zenco')).send({ message: 'Hola' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('no esta configurado');
  });

  it('Saludo: cliente saluda, Ana responde', async () => {
    const res = await request(app).post('/api/zenco/chat').set('Authorization', authHeader('zenco')).send({ message: 'Hola buenas tardes' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toBeTruthy();
    expect(mockSendMessage).toHaveBeenCalledOnce();
    expect(mockSendMessage).toHaveBeenCalledWith('Hola buenas tardes');
  });

  it('Pre-carga datos del cliente cuando envía senderPhone', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'c1', name: 'María', phone: '1111', business: 'zenco', notes: 'clienta frecuente',
    });
    mockPrisma.order.findMany.mockResolvedValue([
      { garmentName: 'Pantalón', repairType: 'dobladillo', status: 'en_proceso', deliveryDate: '2026-04-10', price: 3000, clientPhone: '1111' },
    ]);
    mockSendMessage.mockResolvedValue({
      response: { text: () => 'Hola María! Tu pantalón con dobladillo está en proceso.' },
    });

    const res = await request(app)
      .post('/api/zenco/chat')
      .set('Authorization', authHeader('zenco'))
      .send({ message: 'Hola, quiero saber cómo va mi pedido', senderPhone: '1111' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('María');
    expect(mockPrisma.client.findUnique).toHaveBeenCalled();
    expect(mockPrisma.order.findMany).toHaveBeenCalled();
  });

  it('Busca cliente por nombre en el mensaje cuando no hay senderPhone', async () => {
    mockPrisma.client.findMany.mockResolvedValue([
      { name: 'Juan', phone: '2222', business: 'zenco' },
    ]);
    mockPrisma.order.findMany.mockResolvedValue([
      { garmentName: 'Campera', repairType: 'cierre', status: 'listo', deliveryDate: '2026-04-08', price: 5000, clientPhone: '2222' },
    ]);
    mockSendMessage.mockResolvedValue({
      response: { text: () => 'Hola Juan! Tu campera ya esta lista para retirar.' },
    });

    const res = await request(app).post('/api/zenco/chat').set('Authorization', authHeader('zenco')).send({ message: 'Hola soy Juan, como va mi arreglo?' });
    expect(res.status).toBe(200);
    // buildContext should have searched by name "Juan"
    expect(mockPrisma.client.findMany).toHaveBeenCalled();
  });

  it('Sin cliente identificado: muestra pedidos recientes como contexto', async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      { clientName: 'Ana', clientPhone: '3333', garmentName: 'Vestido', repairType: 'entalle', status: 'pendiente', price: 8000 },
    ]);

    const res = await request(app).post('/api/zenco/chat').set('Authorization', authHeader('zenco')).send({ message: 'Hola' });
    expect(res.status).toBe(200);
    expect(mockPrisma.order.findMany).toHaveBeenCalled();
  });

  it('Pasa history al backend para memoria multi-turno', async () => {
    const history = [
      { role: 'user', parts: [{ text: 'Hola' }] },
      { role: 'model', parts: [{ text: 'Hola! Bienvenida a Zenco' }] },
    ];

    const res = await request(app)
      .post('/api/zenco/chat')
      .set('Authorization', authHeader('zenco'))
      .send({ message: 'Y mi pedido?', history });

    expect(res.status).toBe(200);
    expect(mockStartChat).toHaveBeenCalledWith(expect.objectContaining({ history }));
  });

  it('Auto-registra cliente nuevo cuando envía senderPhone', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null);
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.client.upsert.mockResolvedValue({});

    await request(app)
      .post('/api/zenco/chat')
      .set('Authorization', authHeader('zenco'))
      .send({ message: 'Hola', senderPhone: '9999' });

    expect(mockPrisma.client.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phone_business: { phone: '9999', business: 'zenco' } },
        create: expect.objectContaining({ phone: '9999', business: 'zenco' }),
      })
    );
  });

  it('Graceful fallback on Gemini error', async () => {
    mockSendMessage.mockRejectedValue(new Error('Gemini down'));
    const res = await request(app).post('/api/zenco/chat').set('Authorization', authHeader('zenco')).send({ message: 'Hola' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('ocupada');
  });
});
