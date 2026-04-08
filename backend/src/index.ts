import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { zencoRoutes } from './routes/zenco.js';
import { damianRoutes } from './routes/damian.js';
import { chatZencoRoutes } from './routes/chat-zenco.js';
import { chatDamianRoutes } from './routes/chat-damian.js';
import { agentDamianRoutes } from './routes/agent-damian.js';
import { notificationRoutes } from './routes/notifications.js';
import { garmentPhotosRoutes } from './routes/garment-photos.js';
import { whatsappRoutes } from './routes/whatsapp.js';
import { chatHistoryRoutes } from './routes/chat-history.js';
import { errorHandler, requestLogger } from './middleware/errorHandler.js';
import { authenticate, requireBusiness } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Health check de variables de entorno críticas
const criticalEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'GEMINI_API_KEY'];
const missingVars = criticalEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`[CRITICO] Faltan variables de entorno: ${missingVars.join(', ')}`);
  if (process.env.NODE_ENV === 'production') {
    console.error('El servidor podria fallar al procesar requests.');
  }
}

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://zenko-app.onrender.com',
  'https://damian-app.onrender.com',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Still allow but log — don't block yet
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(requestLogger);

// Static files — serve uploaded garment photos
app.use('/uploads', express.static(path.resolve('uploads')));

// Public routes — no auth required
app.use('/api/auth', authRoutes);

// Protected routes — JWT required + business check
app.use('/api/zenco', authenticate, requireBusiness('zenco'), zencoRoutes);
app.use('/api/zenco/chat/history', authenticate, requireBusiness('zenco'), chatHistoryRoutes);
app.use('/api/zenco/chat', authenticate, requireBusiness('zenco'), chatZencoRoutes);
app.use('/api/zenco/notifications', authenticate, requireBusiness('zenco'), notificationRoutes);
app.use('/api/zenco/garments/:id/photos', authenticate, requireBusiness('zenco'), garmentPhotosRoutes);
app.use('/api/damian', authenticate, requireBusiness('damian'), damianRoutes);
app.use('/api/damian/chat/history', authenticate, requireBusiness('damian'), chatHistoryRoutes);
app.use('/api/damian/chat', authenticate, requireBusiness('damian'), chatDamianRoutes);
app.use('/api/damian/agent', authenticate, requireBusiness('damian'), agentDamianRoutes);
app.use('/api/whatsapp', authenticate, whatsappRoutes);

// Health check para Render
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', services: ['zenco', 'damian'], timestamp: new Date().toISOString() });
});

// DEBUG: Endpoint temporal para diagnosticar la DB en produccion
app.get('/api/debug/db', async (_req, res) => {
  try {
    const { prisma } = await import('./db.js');
    const tables: any[] = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const columns: any[] = await prisma.$queryRaw`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `;

    res.json({
      database_url_exists: !!process.env.DATABASE_URL,
      database_url_protocol: process.env.DATABASE_URL?.split(':')[0],
      tables: tables.map(t => t.table_name),
      details: columns
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Backwards compatibility: redirect old routes
app.get('/api/garments', (_req, res) => res.redirect(301, '/api/zenco/garments'));
app.get('/api/appointments', (_req, res) => res.redirect(301, '/api/damian/appointments'));

// Centralized error handler — must be last
app.use(errorHandler);

// Export app for testing
export { app };

// Only listen if run directly (not imported by tests)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Zenko Unified Backend corriendo en http://localhost:${PORT}`);
    console.log(`  Zenco API: /api/zenco/*`);
    console.log(`  Damian API: /api/damian/*`);
  });
}
