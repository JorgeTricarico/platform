import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

// GET /api/zenco/notifications/:clientId — fetch notifications (use "all" for all clients)
router.get('/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const where = clientId === 'all' ? {} : { clientId };
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
