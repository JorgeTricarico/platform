import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { app } from '../index.js';
import { authHeader } from './setup.js';

const mockPrisma = prisma as unknown as {
  chatMessage: {
    findMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

// Mock Gemini (needed because app imports chat routes)
const mockSendMessage = vi.fn();
vi.mock('@google/generative-ai', () => {
  class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return {
        startChat: () => ({ sendMessage: mockSendMessage }),
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
      text: () => 'Respuesta del bot',
      functionCalls: () => null,
    },
  });
});

// --- GET /api/:business/chat/history ---

describe('GET /api/:business/chat/history', () => {
  it('returns 400 when sessionId is missing', async () => {
    const res = await request(app).get('/api/zenco/chat/history').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('sessionId');
  });

  it('returns empty array when no messages exist', async () => {
    mockPrisma.chatMessage.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/zenco/chat/history?sessionId=2026-04-05').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body.messages).toEqual([]);
  });

  it('returns messages for a valid sessionId', async () => {
    const mockMessages = [
      { id: '1', business: 'zenco', role: 'user', content: 'Hola', sessionId: '2026-04-05', createdAt: new Date() },
      { id: '2', business: 'zenco', role: 'assistant', content: 'Hola! Bienvenida', sessionId: '2026-04-05', createdAt: new Date() },
    ];
    mockPrisma.chatMessage.findMany.mockResolvedValue(mockMessages);

    const res = await request(app).get('/api/zenco/chat/history?sessionId=2026-04-05').set('Authorization', authHeader('zenco'));
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(2);
    expect(res.body.messages[0].role).toBe('user');
    expect(res.body.messages[1].role).toBe('assistant');
  });

  it('queries with correct business filter', async () => {
    mockPrisma.chatMessage.findMany.mockResolvedValue([]);
    await request(app).get('/api/mg_masajes/chat/history?sessionId=sess-1').set('Authorization', authHeader('mg_masajes'));

    expect(mockPrisma.chatMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { business: 'mg_masajes', sessionId: 'sess-1' },
        orderBy: { createdAt: 'asc' },
      })
    );
  });

  it('works for mg_masajes business', async () => {
    mockPrisma.chatMessage.findMany.mockResolvedValue([
      { id: '1', business: 'mg_masajes', role: 'user', content: 'Quiero un turno', sessionId: 's1', createdAt: new Date() },
    ]);

    const res = await request(app).get('/api/mg_masajes/chat/history?sessionId=s1').set('Authorization', authHeader('mg_masajes'));
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(1);
  });
});

// --- POST /api/:business/chat persists messages ---

describe('POST /api/:business/chat — persists messages to DB', () => {
  it('saves user and assistant messages when sessionId provided', async () => {
    mockPrisma.chatMessage.createMany.mockResolvedValue({ count: 2 });

    const res = await request(app)
      .post('/api/zenco/chat')
      .set('Authorization', authHeader('zenco'))
      .send({
        message: 'Hola Ana',
        sessionId: '2026-04-05',
      });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBeTruthy();
    expect(mockPrisma.chatMessage.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ business: 'zenco', role: 'user', content: 'Hola Ana', sessionId: '2026-04-05' }),
        expect.objectContaining({ business: 'zenco', role: 'assistant', content: 'Respuesta del bot', sessionId: '2026-04-05' }),
      ],
    });
  });

  it('does NOT persist messages when sessionId is absent', async () => {
    const res = await request(app).post('/api/zenco/chat').set('Authorization', authHeader('zenco')).send({ message: 'Hola' });
    expect(res.status).toBe(200);
    expect(mockPrisma.chatMessage.createMany).not.toHaveBeenCalled();
  });

  it('persists messages for mg_masajes business too', async () => {
    mockPrisma.chatMessage.createMany.mockResolvedValue({ count: 2 });

    const res = await request(app)
      .post('/api/mg_masajes/chat')
      .set('Authorization', authHeader('mg_masajes'))
      .send({
        message: 'Quiero un turno',
        sessionId: 'sess-abc',
      });

    expect(res.status).toBe(200);
    expect(mockPrisma.chatMessage.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ business: 'mg_masajes', role: 'user', content: 'Quiero un turno', sessionId: 'sess-abc' }),
        expect.objectContaining({ business: 'mg_masajes', role: 'assistant', sessionId: 'sess-abc' }),
      ],
    });
  });

  it('chat still works if message persistence fails', async () => {
    mockPrisma.chatMessage.createMany.mockRejectedValue(new Error('DB down'));

    const res = await request(app)
      .post('/api/zenco/chat')
      .set('Authorization', authHeader('zenco'))
      .send({
        message: 'Hola',
        sessionId: '2026-04-05',
      });

    // Chat should still return the reply even if persistence fails
    expect(res.status).toBe(200);
    expect(res.body.reply).toBeTruthy();
  });
});
