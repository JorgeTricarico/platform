import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../db.js';

const router = Router();

const SYSTEM_PROMPT = `Eres Ana, dueña de Zenco (taller de arreglos de ropa e indumentaria en Argentina).
Eres amable, profesional y servicial.
Tu funcion es atender consultas de clientes sobre:
- Estado de sus arreglos/pedidos (si preguntan, usa la informacion de la base de datos)
- Tipos de arreglos que haces: dobladillo, cambio de cierre, entalle/achicar, diseño nuevo
- Presupuestos aproximados
- Tiempos de entrega

REGLAS ESTRICTAS:
- NUNCA inventes datos de pedidos. Si no tenes info, decile que te pase su nombre o telefono.
- Responde en español argentino casual pero profesional.
- Respuestas cortas (maximo 3 oraciones).
- Si preguntan algo que no es sobre ropa/arreglos, redirigí amablemente.`;

router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.json({ reply: 'El bot no esta configurado todavia. Contactanos directamente!' });

    // Try to find relevant order data for context
    let dbContext = '';
    try {
      const orders = await prisma.order.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
      if (orders.length > 0) {
        dbContext = '\n\nPedidos recientes en la base de datos:\n' + orders.map(o =>
          `- ${o.clientName} (${o.clientPhone}): ${o.garmentName} - ${o.repairType} - Estado: ${o.status} - Entrega: ${o.deliveryDate} - $${o.price}`
        ).join('\n');
      }
    } catch { /* DB not available, continue without context */ }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
    const result = await model.generateContent(`${SYSTEM_PROMPT}${dbContext}\n\nMensaje del cliente: ${message}`);
    const reply = result.response.text();

    res.json({ reply });
  } catch (error) {
    console.error('Chat Zenco error:', error);
    res.json({ reply: 'Perdon, estoy un poco ocupada en el taller. Escribime en un ratito!' });
  }
});

export { router as chatZencoRoutes };
