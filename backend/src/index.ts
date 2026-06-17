import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { zencoRoutes } from './routes/zenco.js';
import { mgMasajesRoutes } from './routes/mg_masajes.js';
import { chatZencoRoutes } from './routes/chat-zenco.js';
import { chatMgMasajesRoutes } from './routes/chat-mg_masajes.js';
import { agentMgMasajesRoutes } from './routes/agent-mg_masajes.js';
import { notificationRoutes } from './routes/notifications.js';
import { garmentPhotosRoutes } from './routes/garment-photos.js';
import { whatsappRoutes } from './routes/whatsapp.js';
import { chatHistoryRoutes } from './routes/chat-history.js';
import { errorHandler, requestLogger } from './middleware/errorHandler.js';
import { authenticate, requireBusiness } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { publicRoutes } from './routes/public.js';
import { errorsRoutes } from './routes/errors.js';

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
      callback(new Error('Not allowed by CORS'));
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
app.use('/api/public', publicRoutes);
app.use('/api/zenco/chat', chatZencoRoutes);

// Error tracking — POST publico, GET/PATCH con auth (manejado internamente)
app.use('/api/errors', errorsRoutes);

// Protected routes — JWT required + business check
app.use('/api/zenco', authenticate, requireBusiness('zenco'), zencoRoutes);
app.use('/api/zenco/chat/history', authenticate, requireBusiness('zenco'), chatHistoryRoutes);
app.use('/api/zenco/notifications', authenticate, requireBusiness('zenco'), notificationRoutes);
app.use('/api/zenco/garments/:id/photos', authenticate, requireBusiness('zenco'), garmentPhotosRoutes);
app.use('/api/mg_masajes', authenticate, requireBusiness('mg_masajes'), mgMasajesRoutes);
app.use('/api/mg_masajes/chat/history', authenticate, requireBusiness('mg_masajes'), chatHistoryRoutes);
app.use('/api/mg_masajes/chat', authenticate, requireBusiness('mg_masajes'), chatMgMasajesRoutes);
app.use('/api/mg_masajes/agent', authenticate, requireBusiness('mg_masajes'), agentMgMasajesRoutes);
app.use('/api/whatsapp', authenticate, whatsappRoutes);

// Health check para Render
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', services: ['zenco', 'mg_masajes'], timestamp: new Date().toISOString() });
});

// Backwards compatibility: redirect old routes
app.get('/api/garments', (_req, res) => res.redirect(301, '/api/zenco/garments'));
app.get('/api/appointments', (_req, res) => res.redirect(301, '/api/mg_masajes/appointments'));

// Centralized error handler — must be last
app.use(errorHandler);

// Export app for testing
export { app };

// Only listen if run directly (not imported by tests)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Zenko Unified Backend corriendo en http://localhost:${PORT}`);
    console.log(`  Zenco API: /api/zenco/*`);
    console.log(`  MG Masajes API: /api/mg_masajes/*`);
  });
}
