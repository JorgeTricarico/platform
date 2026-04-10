import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { prisma } from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-key';

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', JWT_SECRET);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'user-1',
      email: 'ana@zenco.com',
      passwordHash: 'hashed',
      name: 'Ana',
      role: 'admin',
      business: 'zenco',
      createdAt: new Date(),
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return token', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'ana@zenco.com',
        password: 'secret123',
        name: 'Ana',
        business: 'zenco',
      });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('ana@zenco.com');
      expect(res.body.user.name).toBe('Ana');
      expect(res.body.user.business).toBe('zenco');
      expect(res.body.user).not.toHaveProperty('passwordHash');

      // Verify token is valid
      const decoded = jwt.verify(res.body.token, JWT_SECRET) as Record<string, unknown>;
      expect(decoded.userId).toBe('user-1');
      expect(decoded.business).toBe('zenco');
    });

    it('should return 409 if email already exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'ana@zenco.com',
        passwordHash: 'hashed',
        name: 'Ana',
        role: 'admin',
        business: 'zenco',
        createdAt: new Date(),
      });

      const res = await request(app).post('/api/auth/register').send({
        email: 'ana@zenco.com',
        password: 'secret123',
        name: 'Ana',
        business: 'zenco',
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email ya registrado');
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'not-an-email',
        password: 'secret123',
        name: 'Ana',
        business: 'zenco',
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 for short password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'ana@zenco.com',
        password: '12345',
        name: 'Ana',
        business: 'zenco',
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid business', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'ana@zenco.com',
        password: 'secret123',
        name: 'Ana',
        business: 'invalid',
      });

      expect(res.status).toBe(400);
    });

    it('should hash the password before storing', async () => {
      await request(app).post('/api/auth/register').send({
        email: 'ana@zenco.com',
        password: 'secret123',
        name: 'Ana',
        business: 'zenco',
      });

      const createCall = vi.mocked(prisma.user.create).mock.calls[0][0];
      expect(createCall.data.passwordHash).not.toBe('secret123');
      const isHashed = await bcrypt.compare('secret123', createCall.data.passwordHash);
      expect(isHashed).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    const hashedPassword = bcrypt.hashSync('secret123', 10);

    it('should login by name and return token', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([{
        id: 'user-1',
        email: 'ana@zenco.com',
        passwordHash: hashedPassword,
        name: 'Ana',
        role: 'admin',
        business: 'zenco',
        createdAt: new Date(),
      }]);

      const res = await request(app).post('/api/auth/login').send({
        name: 'Ana',
        password: 'secret123',
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.name).toBe('Ana');
    });

    it('should return 401 for wrong password', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([{
        id: 'user-1',
        email: 'ana@zenco.com',
        passwordHash: hashedPassword,
        name: 'Ana',
        role: 'admin',
        business: 'zenco',
        createdAt: new Date(),
      }]);

      const res = await request(app).post('/api/auth/login').send({
        name: 'Ana',
        password: 'wrong-password',
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Credenciales invalidas');
    });

    it('should return 401 for non-existent user', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const res = await request(app).post('/api/auth/login').send({
        name: 'NoExiste',
        password: 'secret123',
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Credenciales invalidas');
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app).post('/api/auth/login').send({
        name: 'Ana',
      });

      expect(res.status).toBe(400);
    });
  });
});

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', JWT_SECRET);
  });

  it('should return 401 without Authorization header', async () => {
    const res = await request(app).get('/api/zenco/garments');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token requerido');
  });

  it('should return 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/zenco/garments')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token invalido o expirado');
  });

  it('should return 401 with expired token', async () => {
    const expiredToken = jwt.sign(
      { userId: 'user-1', email: 'ana@zenco.com', role: 'admin', business: 'zenco' },
      JWT_SECRET,
      { expiresIn: '-1s' },
    );
    const res = await request(app)
      .get('/api/zenco/garments')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });

  it('should allow access with valid token', async () => {
    const token = jwt.sign(
      { userId: 'user-1', email: 'ana@zenco.com', role: 'admin', business: 'zenco' },
      JWT_SECRET,
      { expiresIn: '7d' },
    );
    const res = await request(app)
      .get('/api/zenco/garments')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('should allow /health without auth', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should allow /api/auth routes without auth', async () => {
    // Login attempt (will fail with 401 credentials, NOT 401 token)
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    const res = await request(app).post('/api/auth/login').send({
      name: 'Test',
      password: 'test123',
    });
    // 401 from credentials check, not from auth middleware
    expect(res.body.error).toBe('Credenciales invalidas');
  });

  it('should block zenco user from mg_masajes routes', async () => {
    const token = jwt.sign(
      { userId: 'user-1', email: 'ana@zenco.com', role: 'admin', business: 'zenco' },
      JWT_SECRET,
      { expiresIn: '7d' },
    );
    const res = await request(app)
      .get('/api/mg_masajes/appointments')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('No tenes acceso a este negocio');
  });

  it('should allow "all" business user to access any route', async () => {
    const token = jwt.sign(
      { userId: 'user-1', email: 'jorge@platform.com', role: 'admin', business: 'all' },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    const zencoRes = await request(app)
      .get('/api/zenco/garments')
      .set('Authorization', `Bearer ${token}`);
    expect(zencoRes.status).toBe(200);

    const mgMasajesRes = await request(app)
      .get('/api/mg_masajes/appointments')
      .set('Authorization', `Bearer ${token}`);
    expect(mgMasajesRes.status).toBe(200);
  });
});
