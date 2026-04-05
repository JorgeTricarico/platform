import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { zencoRoutes } from './routes/zenco.js';
import { damianRoutes } from './routes/damian.js';
import { chatZencoRoutes } from './routes/chat-zenco.js';
import { chatDamianRoutes } from './routes/chat-damian.js';
import { agentDamianRoutes } from './routes/agent-damian.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rutas namespacedas por negocio
app.use('/api/zenco', zencoRoutes);
app.use('/api/zenco/chat', chatZencoRoutes);
app.use('/api/damian', damianRoutes);
app.use('/api/damian/chat', chatDamianRoutes);
app.use('/api/damian/agent', agentDamianRoutes);

// Health check para Render
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', services: ['zenco', 'damian'], timestamp: new Date().toISOString() });
});

// Backwards compatibility: redirect old routes
app.get('/api/garments', (_req, res) => res.redirect(301, '/api/zenco/garments'));
app.get('/api/appointments', (_req, res) => res.redirect(301, '/api/damian/appointments'));

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
