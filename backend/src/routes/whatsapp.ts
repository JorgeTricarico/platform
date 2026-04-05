import { Router } from 'express';
import { z } from 'zod';
import { whatsappService } from '../services/whatsapp.js';

const router = Router();

const SendSchema = z.object({
  to: z.string().min(7, 'Numero invalido'),
  message: z.string().min(1, 'Mensaje requerido'),
});

// GET /api/whatsapp/status
router.get('/status', (_req, res) => {
  res.json(whatsappService.getStatus());
});

// GET /api/whatsapp/qr
router.get('/qr', (_req, res) => {
  const qr = whatsappService.getQR();
  if (!qr) {
    return res.status(503).json({ error: 'QR no disponible. WhatsApp ya conectado o aun iniciando.' });
  }
  res.json({ qr });
});

// POST /api/whatsapp/send
router.post('/send', async (req, res) => {
  const parsed = SendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', details: parsed.error.flatten() });
  }

  const { connected } = whatsappService.getStatus();
  if (!connected) {
    return res.status(503).json({ error: 'WhatsApp no esta conectado. Escanea el QR primero.' });
  }

  try {
    const { to, message } = parsed.data;
    const result = await whatsappService.sendMessage(to, message);
    res.json({ success: true, messageId: result.id });
  } catch (error) {
    console.error('[WhatsApp] Send error:', error);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

export { router as whatsappRoutes };
