import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { prisma } from '../db.js';
import * as aiChat from '../services/ai-chat.js';
import { authHeader } from './setup.js';

// Mock AI Service
vi.mock('../services/ai-chat.js', () => ({
  chatWithFallback: vi.fn(),
}));

const mockPrisma = prisma as any;
const mockChat = aiChat.chatWithFallback as any;

describe('Agent Damian API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Refuses empty messages', async () => {
    const res = await request(app)
      .post('/api/damian/agent')
      .set('Authorization', authHeader('damian'))
      .send({ message: '' });
    expect(res.status).toBe(400);
  });

  it('Processes message and maintains history in response context', async () => {
    mockChat.mockResolvedValue({ reply: 'Hola Damian', provider: 'gemini' });

    const history = [{ role: 'user', parts: [{ text: 'hola' }] }];
    const res = await request(app)
      .post('/api/damian/agent')
      .set('Authorization', authHeader('damian'))
      .send({ message: 'como va?', history });

    expect(res.status).toBe(200);
    expect(mockChat).toHaveBeenCalledWith(expect.objectContaining({
      message: 'como va?',
      history,
    }));
    expect(res.body.reply).toBe('Hola Damian');
  });

  it('Tool: search_patients works correctly', async () => {
    mockChat.mockImplementation(async ({ onFunctionCall }) => {
      const toolRes = await onFunctionCall('search_patients', { query: 'Jorge' });
      return { reply: `Encontre a ${toolRes.patients.length} pacientes`, provider: 'gemini' };
    });

    mockPrisma.client.findMany.mockResolvedValue([
      { id: '1', name: 'Jorge T', phone: '123' }
    ]);

    const res = await request(app)
      .post('/api/damian/agent')
      .set('Authorization', authHeader('damian'))
      .send({ message: 'busca a Jorge' });

    expect(res.status).toBe(200);
    expect(mockPrisma.client.findMany).toHaveBeenCalled();
    expect(res.body.reply).toContain('Encontre a 1 pacientes');
  });
});
