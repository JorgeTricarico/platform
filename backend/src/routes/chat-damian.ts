import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../db.js';

const router = Router();

const SYSTEM_PROMPT = `Eres Damian, masajista profesional experto. Tenes un consultorio de masajes y bienestar en Argentina.
Eres calmado, educado y servicial.
Tu funcion es atender consultas de clientes sobre:
- Tipos de masajes: Descontracturante, Relajante, Deportivo, Drenaje Linfatico
- Disponibilidad de turnos (si preguntan, usa la informacion de la base de datos)
- Estado de sus citas
- Precios y duraciones

REGLAS ESTRICTAS:
- NUNCA inventes datos de citas. Si no tenes info, pedile su nombre o telefono.
- NUNCA des consejos medicos ni diagnosticos. Si describen sintomas, sugeri una consulta presencial.
- Responde en español argentino casual pero profesional.
- Respuestas cortas (maximo 3 oraciones).
- Si preguntan algo que no es sobre masajes/bienestar, redirigí amablemente.`;

router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.json({ reply: 'El bot no esta configurado todavia. Contactanos directamente!' });

    // Try to find relevant appointment data for context
    let dbContext = '';
    try {
      const appointments = await prisma.appointment.findMany({ take: 5, orderBy: { date: 'asc' } });
      if (appointments.length > 0) {
        dbContext = '\n\nCitas recientes en la agenda:\n' + appointments.map(a =>
          `- ${a.clientName} (${a.clientPhone}): ${a.service} - ${a.date} ${a.time} - Estado: ${a.status} - $${a.price}`
        ).join('\n');
      }
    } catch { /* DB not available, continue without context */ }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(`${SYSTEM_PROMPT}${dbContext}\n\nMensaje del cliente: ${message}`);
    const reply = result.response.text();

    res.json({ reply });
  } catch (error) {
    console.error('Chat Damian error:', error);
    res.json({ reply: 'Disculpa, estoy en una sesion ahora. Te respondo apenas termine!' });
  }
});

export { router as chatDamianRoutes };
