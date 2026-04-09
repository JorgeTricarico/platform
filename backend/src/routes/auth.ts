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

    // Search by name OR email (case-insensitive)
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { email: { equals: name, mode: 'insensitive' } },
        ],
      },
    });

    if (users.length === 0) {
      res.status(401).json({ error: 'Credenciales invalidas' });
      return;
    }

    // Attempt to verify password against all matching users (handles name collisions)
    let authenticatedUser = null;
    for (const user of users) {
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (valid) {
        authenticatedUser = user;
        break;
      }
    }

    if (!authenticatedUser) {
      res.status(401).json({ error: 'Credenciales invalidas' });
      return;
    }

    const token = signToken({
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
      role: authenticatedUser.role,
      business: authenticatedUser.business,
    });

    res.json({
      token,
      user: {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        name: authenticatedUser.name,
        role: authenticatedUser.role,
        business: authenticatedUser.business,
      },
    });
  }),
);
