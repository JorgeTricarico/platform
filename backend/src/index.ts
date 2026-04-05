import express from 'express';
import cors from 'cors';
import { zencoRoutes } from './routes/zenco.js';
import { damianRoutes } from './routes/damian.js';
import { chatZencoRoutes } from './routes/chat-zenco.js';
import { chatDamianRoutes } from './routes/chat-damian.js';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rutas namespacedas por negocio
app.use('/api/zenco', zencoRoutes);
app.use('/api/zenco/chat', chatZencoRoutes);
app.use('/api/damian', damianRoutes);
app.use('/api/damian/chat', chatDamianRoutes);

// Health check para Render
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', services: ['zenco', 'damian'], timestamp: new Date().toISOString() });
});

// Backwards compatibility: redirect old routes
app.get('/api/garments', (_req, res) => res.redirect(301, '/api/zenco/garments'));
app.get('/api/appointments', (_req, res) => res.redirect(301, '/api/damian/appointments'));

app.listen(PORT, () => {
  console.log(`Zenko Unified Backend corriendo en http://localhost:${PORT}`);
  console.log(`  Zenco API: /api/zenco/*`);
  console.log(`  Damian API: /api/damian/*`);
});
