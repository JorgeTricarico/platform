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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Static files — serve uploaded garment photos
app.use('/uploads', express.static(path.resolve('uploads')));

// Rutas namespacedas por negocio
app.use('/api/zenco', zencoRoutes);
app.use('/api/zenco/chat/history', chatHistoryRoutes);
app.use('/api/zenco/chat', chatZencoRoutes);
app.use('/api/zenco/notifications', notificationRoutes);
app.use('/api/zenco/garments/:id/photos', garmentPhotosRoutes);
app.use('/api/damian', damianRoutes);
app.use('/api/damian/chat/history', chatHistoryRoutes);
app.use('/api/damian/chat', chatDamianRoutes);
app.use('/api/damian/agent', agentDamianRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Health check para Render
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', services: ['zenco', 'damian'], timestamp: new Date().toISOString() });
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
