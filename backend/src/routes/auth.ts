import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { validate, registerSchema, loginSchema } from '../schemas.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { signToken, isAuthRequired } from '../middleware/auth.js';

export const authRoutes = Router();

// GET /api/auth/status — check if auth is required
authRoutes.get('/status', (_req, res) => {
  res.json({ requireAuth: isAuthRequired() });
});

// POST /api/auth/register
authRoutes.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name, business } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email ya registrado' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, business },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      business: user.business,
    });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, business: user.business },
    });
  }),
);

// POST /api/auth/login
authRoutes.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { name, password } = req.body;

    const users = await prisma.user.findMany({ where: { name: { equals: name, mode: 'insensitive' } } });
    const user = users[0] || null;
    if (!user) {
      res.status(401).json({ error: 'Credenciales invalidas' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Credenciales invalidas' });
      return;
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      business: user.business,
    });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, business: user.business },
    });
  }),
);
