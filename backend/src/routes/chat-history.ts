import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

// GET /api/:business/chat/history?sessionId=xxx
router.get('/', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId es requerido' });
  }

  // Extract business from baseUrl: /api/mg_masajes/chat/history → 'mg_masajes'
  const match = req.baseUrl.match(/\/api\/([^/]+)\//);
  const business = match ? match[1] : 'zenco';

  try {
    const messages = await prisma.chatMessage.findMany({
      where: { business, sessionId },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ messages });
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ error: 'Error al cargar historial' });
  }
});

export { router as chatHistoryRoutes };
