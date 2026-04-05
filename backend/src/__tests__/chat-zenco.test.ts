import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { app } from '../index.js';

const mockPrisma = prisma as unknown as {
  client: { findUnique: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
  order: { findMany: ReturnType<typeof vi.fn> };
};

// Mock Gemini SDK — Zenco now uses startChat + sendMessage (same as Damian)
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
  mockSendMessage.mockResolvedValue({
    response: {
      text: () => 'Hola! Bienvenido a Zenco, ¿en qué te puedo ayudar?',
      functionCalls: () => null,
    },
  });
});

// --- CONVERSATION TESTS ---

describe('POST /api/zenco/chat — Conversación ida y vuelta', () => {
  it('returns 400 when message is empty', async () => {
    const res = await request(app).post('/api/zenco/chat').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Mensaje requerido');
  });

  it('returns fallback when no API key', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await request(app).post('/api/zenco/chat').send({ message: 'Hola' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('no esta configurado');
  });

  it('Saludo: cliente saluda, Ana responde amablemente', async () => {
    mockSendMessage.mockResolvedValue({
      response: { text: () => 'Hola! Bienvenida a Zenco, ¿en qué te puedo ayudar?', functionCalls: () => null },
    });

    const res = await request(app).post('/api/zenco/chat').send({ message: 'Hola buenas tardes' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toBeTruthy();
    expect(typeof res.body.reply).toBe('string');
    // Verify sendMessage was called with the user message
    expect(mockSendMessage).toHaveBeenCalledOnce();
    expect(mockSendMessage).toHaveBeenCalledWith('Hola buenas tardes');
  });

  it('Consulta estado: cliente pregunta por su pedido con teléfono', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'c1', name: 'María', phone: '1111', business: 'zenco', notes: 'clienta frecuente',
    });
    mockPrisma.order.findMany.mockResolvedValue([
      { garmentName: 'Pantalón', repairType: 'dobladillo', status: 'en_proceso', deliveryDate: '2026-04-10', price: 3000 },
    ]);
    mockSendMessage.mockResolvedValue({
      response: { text: () => 'Hola María! Tu pantalón con dobladillo está en proceso, lo tenemos listo para el 10 de abril.', functionCalls: () => null },
    });

    const res = await request(app).post('/api/zenco/chat').send({
      message: 'Hola, quiero saber cómo va mi pedido',
      senderPhone: '1111',
    });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('María');
    // Verify client was looked up and message sent
    expect(mockPrisma.client.findUnique).toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledWith('Hola, quiero saber cómo va mi pedido');
  });

  it('Consulta precios: cliente pregunta presupuesto', async () => {
    mockSendMessage.mockResolvedValue({
      response: { text: () => 'Un dobladillo de pantalón sale aproximadamente $3000-5000 dependiendo de la tela. ¿Querés traerlo para que lo vea?', functionCalls: () => null },
    });

    const res = await request(app).post('/api/zenco/chat').send({
      message: '¿Cuánto sale hacer un dobladillo?',
    });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBeTruthy();
    expect(mockSendMessage).toHaveBeenCalledWith('¿Cuánto sale hacer un dobladillo?');
  });

  it('Sin pedidos: usa contexto general de pedidos recientes', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null);
    mockPrisma.order.findMany.mockResolvedValue([
      { clientName: 'Juan', clientPhone: '2222', garmentName: 'Campera', repairType: 'cierre', status: 'listo', deliveryDate: '2026-04-08', price: 5000 },
    ]);
    mockSendMessage.mockResolvedValue({
      response: { text: () => '¡Hola! ¿Cómo te puedo ayudar? Si querés consultar un pedido, pasame tu nombre o teléfono.', functionCalls: () => null },
    });

    const res = await request(app).post('/api/zenco/chat').send({ message: 'Hola' });
    expect(res.status).toBe(200);
    // Should have fetched general orders as context
    expect(mockPrisma.order.findMany).toHaveBeenCalled();
  });

  it('Pasa history al backend para memoria multi-turno', async () => {
    mockSendMessage.mockResolvedValue({
      response: { text: () => 'Dale, el pantalón está en proceso todavía.', functionCalls: () => null },
    });

    const history = [
      { role: 'user', parts: [{ text: 'Hola' }] },
      { role: 'model', parts: [{ text: 'Hola! Bienvenida a Zenco' }] },
    ];

    const res = await request(app).post('/api/zenco/chat').send({
      message: 'Y mi pedido?',
      history,
    });

    expect(res.status).toBe(200);
    expect(mockStartChat).toHaveBeenCalledWith(expect.objectContaining({ history }));
  });

  it('Auto-registra cliente nuevo cuando envía senderPhone desconocido', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null);
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.client.upsert.mockResolvedValue({});

    await request(app).post('/api/zenco/chat').send({
      message: 'Hola',
      senderPhone: '9999',
    });

    expect(mockPrisma.client.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phone_business: { phone: '9999', business: 'zenco' } },
        create: expect.objectContaining({ phone: '9999', business: 'zenco' }),
      })
    );
  });

  it('Graceful fallback on Gemini error', async () => {
    mockSendMessage.mockRejectedValue(new Error('Gemini down'));
    const res = await request(app).post('/api/zenco/chat').send({ message: 'Hola' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('ocupada');
  });
});
