import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { app } from '../index.js';
import { authHeader } from './setup.js';
import { chatWithFallback } from '../services/ai-chat.js';

vi.mock('../services/ai-chat.js');
const mockChat = chatWithFallback as ReturnType<typeof vi.fn>;

const mockPrisma = prisma as unknown as {
  client: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
  order: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.order.count.mockResolvedValue(0);
  mockChat.mockResolvedValue({ reply: 'Hola! Bienvenido a Zenco, en que te puedo ayudar?', provider: 'gemini' });
});

describe('POST /api/zenco/chat — Conversación con contexto pre-cargado', () => {
  it('returns 400 when message is empty', async () => {
    const res = await request(app).post('/api/zenco/chat').set('Authorization', authHeader('zenco')).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Mensaje requerido');
  });

  it('Saludo: cliente saluda, Ana responde', async () => {
    const res = await request(app).post('/api/zenco/chat').set('Authorization', authHeader('zenco')).send({ message: 'Hola buenas tardes' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toBeTruthy();
    expect(mockChat).toHaveBeenCalledOnce();
    expect(mockChat).toHaveBeenCalledWith(expect.objectContaining({ message: 'Hola buenas tardes' }));
  });

  it('Pre-carga datos del cliente cuando envía senderPhone', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'c1', name: 'María', phone: '1111', business: 'zenco', notes: 'clienta frecuente',
    });
    mockPrisma.order.findMany.mockResolvedValue([
      { id: 'ORD-C-1', orderNumber: 1, garmentName: 'Pantalón', repairType: 'dobladillo', status: 'en_proceso', deliveryDate: '2026-04-10', price: 3000, clientPhone: '1111' },
    ]);
    mockChat.mockResolvedValue({ reply: 'Hola María! Tu pantalón está en proceso.', provider: 'gemini' });

    const res = await request(app)
      .post('/api/zenco/chat')
      .set('Authorization', authHeader('zenco'))
      .send({ message: 'Hola, quiero saber cómo va mi pedido', senderPhone: '1111' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('María');
    expect(mockPrisma.client.findUnique).toHaveBeenCalled();
    expect(mockPrisma.order.findMany).toHaveBeenCalled();
    // System prompt should contain client context
    expect(mockChat.mock.calls[0][0].systemPrompt).toContain('María');
  });

  it('Busca cliente por nombre en el mensaje', async () => {
    mockPrisma.client.findMany.mockResolvedValue([
      { name: 'Juan', phone: '2222', business: 'zenco' },
    ]);
    mockPrisma.order.findMany.mockResolvedValue([
      { id: 'ORD-C-2', orderNumber: 2, garmentName: 'Campera', repairType: 'cierre', status: 'listo', deliveryDate: '2026-04-08', price: 5000, clientPhone: '2222' },
    ]);

    await request(app).post('/api/zenco/chat').set('Authorization', authHeader('zenco')).send({ message: 'Hola soy Juan, como va mi arreglo?' });
    expect(mockPrisma.client.findMany).toHaveBeenCalled();
    // System prompt should contain found client data
    expect(mockChat.mock.calls[0][0].systemPrompt).toContain('Juan');
  });

  it('Sin cliente identificado: inyecta pedidos recientes en contexto', async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      { id: 'ORD-C-3', orderNumber: 3, clientName: 'Ana', clientPhone: '3333', garmentName: 'Vestido', repairType: 'entalle', status: 'pendiente', price: 8000 },
    ]);

    await request(app).post('/api/zenco/chat').set('Authorization', authHeader('zenco')).send({ message: 'Hola' });
    expect(mockPrisma.order.findMany).toHaveBeenCalled();
  });

  it('Pasa history a chatWithFallback', async () => {
    const history = [
      { role: 'user', parts: [{ text: 'Hola' }] },
      { role: 'model', parts: [{ text: 'Hola! Bienvenida a Zenco' }] },
    ];

    await request(app)
      .post('/api/zenco/chat')
      .set('Authorization', authHeader('zenco'))
      .send({ message: 'Y mi pedido?', history });

    expect(mockChat).toHaveBeenCalledWith(expect.objectContaining({ history }));
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

  it('Graceful fallback when all AI providers fail', async () => {
    mockChat.mockRejectedValue(new Error('All AI providers failed'));
    const res = await request(app).post('/api/zenco/chat').set('Authorization', authHeader('zenco')).send({ message: 'Hola' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('error');
  });
});
