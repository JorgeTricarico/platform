import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';

// Mock the whatsapp service module
vi.mock('../services/whatsapp.js', () => {
  const mockService = {
    getStatus: vi.fn(),
    getQR: vi.fn(),
    sendMessage: vi.fn(),
    onMessage: vi.fn(),
  };
  return { whatsappService: mockService };
});

import { whatsappService } from '../services/whatsapp.js';

const mockWA = whatsappService as unknown as {
  getStatus: ReturnType<typeof vi.fn>;
  getQR: ReturnType<typeof vi.fn>;
  sendMessage: ReturnType<typeof vi.fn>;
  onMessage: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

// --- STATUS ---

describe('GET /api/whatsapp/status', () => {
  it('returns disconnected status when not connected', async () => {
    mockWA.getStatus.mockReturnValue({ connected: false, qrReady: false });
    const res = await request(app).get('/api/whatsapp/status');
    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(false);
  });

  it('returns connected status when authenticated', async () => {
    mockWA.getStatus.mockReturnValue({ connected: true, qrReady: false, phone: '5491112345678' });
    const res = await request(app).get('/api/whatsapp/status');
    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.phone).toBe('5491112345678');
  });
});

// --- QR CODE ---

describe('GET /api/whatsapp/qr', () => {
  it('returns 503 when no QR available', async () => {
    mockWA.getQR.mockReturnValue(null);
    const res = await request(app).get('/api/whatsapp/qr');
    expect(res.status).toBe(503);
    expect(res.body.error).toContain('QR');
  });

  it('returns QR code string when available', async () => {
    mockWA.getQR.mockReturnValue('mock-qr-string-data');
    const res = await request(app).get('/api/whatsapp/qr');
    expect(res.status).toBe(200);
    expect(res.body.qr).toBe('mock-qr-string-data');
  });
});

// --- SEND MESSAGE ---

describe('POST /api/whatsapp/send', () => {
  it('returns 400 when to is missing', async () => {
    const res = await request(app).post('/api/whatsapp/send').send({ message: 'hello' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 400 when message is missing', async () => {
    const res = await request(app).post('/api/whatsapp/send').send({ to: '5491112345678' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 503 when WhatsApp is not connected', async () => {
    mockWA.getStatus.mockReturnValue({ connected: false });
    const res = await request(app).post('/api/whatsapp/send').send({
      to: '5491112345678',
      message: 'Hola, tu prenda está lista!',
    });
    expect(res.status).toBe(503);
    expect(res.body.error).toContain('conectado');
  });

  it('sends message successfully when connected', async () => {
    mockWA.getStatus.mockReturnValue({ connected: true });
    mockWA.sendMessage.mockResolvedValue({ id: 'msg-123' });

    const res = await request(app).post('/api/whatsapp/send').send({
      to: '5491112345678',
      message: 'Hola, tu prenda está lista!',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockWA.sendMessage).toHaveBeenCalledWith('5491112345678', 'Hola, tu prenda está lista!');
  });

  it('returns 500 when sendMessage throws', async () => {
    mockWA.getStatus.mockReturnValue({ connected: true });
    mockWA.sendMessage.mockRejectedValue(new Error('Send failed'));

    const res = await request(app).post('/api/whatsapp/send').send({
      to: '5491112345678',
      message: 'test',
    });
    expect(res.status).toBe(500);
    expect(res.body.error).toBeTruthy();
  });
});

// --- UNIT TESTS: WhatsApp Service ---

describe('WhatsAppService unit', () => {
  it('getStatus returns expected shape', () => {
    mockWA.getStatus.mockReturnValue({ connected: false, qrReady: false });
    const status = mockWA.getStatus();
    expect(status).toHaveProperty('connected');
    expect(status).toHaveProperty('qrReady');
  });

  it('onMessage registers a callback', () => {
    const callback = vi.fn();
    mockWA.onMessage.mockImplementation((cb: Function) => cb);
    mockWA.onMessage(callback);
    expect(mockWA.onMessage).toHaveBeenCalledWith(callback);
  });
});
