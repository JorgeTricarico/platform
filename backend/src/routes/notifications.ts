import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

// GET /api/zenco/notifications/:clientId — fetch notifications
// :clientId  → "all" o un clientId concreto
// ?audience  → "staff" | "client" (opcional, omitido = sin filtro)
const VALID_AUDIENCES = ['staff', 'client'] as const;
type Audience = (typeof VALID_AUDIENCES)[number];

router.get('/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const audienceRaw = typeof req.query.audience === 'string' ? req.query.audience : undefined;
    if (audienceRaw !== undefined && !VALID_AUDIENCES.includes(audienceRaw as Audience)) {
      return res.status(400).json({ error: 'audience invalido — valores permitidos: staff, client' });
    }
    const where: { clientId?: string; audience?: Audience } = {};
    if (clientId !== 'all') where.clientId = clientId;
    if (audienceRaw) where.audience = audienceRaw as Audience;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
  } catch (error) {
    console.error('[Notifications] Error:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

// PATCH /api/zenco/notifications/:id/read — mark a notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    res.json(updated);
  } catch (error) {
    console.error('[Notifications] Error:', error);
    res.status(500).json({ error: 'Error al marcar notificacion como leida' });
  }
});

export { router as notificationRoutes };
