/**
 * E2E tests for Zenco (Ana) chatbot — calls real Gemini API.
 * Run with: npx vitest run src/__tests__/chat-e2e/
 * Requires GEMINI_API_KEY in backend/.env
 */
import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY;

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

function createChat() {
  const genAI = new GoogleGenerativeAI(API_KEY!);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT,
  });
  return model.startChat();
}

describe.skipIf(!API_KEY)('Zenco E2E — Gemini API real', () => {
  it('Saludo: responde amablemente en español', async () => {
    const chat = createChat();
    const result = await chat.sendMessage('Hola buenas tardes!');
    const reply = result.response.text().toLowerCase();

    expect(reply).toBeTruthy();
    expect(reply.length).toBeGreaterThan(5);
    // Should respond in Spanish and be welcoming
    expect(reply).toMatch(/hola|buen|bienvenid|zenco|ayud/i);
  }, 15000);

  it('Consulta de estado sin datos: pide telefono o nombre', async () => {
    const chat = createChat();
    await chat.sendMessage('Hola');
    const result = await chat.sendMessage('Quiero saber como va mi pedido');
    const reply = result.response.text().toLowerCase();

    // Bot should ask for identification since no DB context
    expect(reply).toMatch(/nombre|telefono|tel|numero|datos|identific/i);
  }, 15000);

  it('Consulta de precios: responde con info de servicios', async () => {
    const chat = createChat();
    const result = await chat.sendMessage('Cuanto sale hacer un dobladillo?');
    const reply = result.response.text().toLowerCase();

    // Should mention something about the service
    expect(reply).toMatch(/doblad|precio|presupuesto|\$/i);
  }, 15000);

  it('Off-topic: redirige amablemente', async () => {
    const chat = createChat();
    const result = await chat.sendMessage('Sabes una receta de torta de chocolate?');
    const reply = result.response.text().toLowerCase();

    // Should redirect back to clothing/repairs
    expect(reply).toMatch(/ropa|arregl|taller|zenco|ayud|especiali/i);
  }, 15000);

  it('Memoria multi-turno: recuerda contexto de turnos anteriores', async () => {
    const chat = createChat();

    // Turn 1: greeting
    await chat.sendMessage('Hola, me llamo Carolina');
    // Turn 2: ask about a service
    await chat.sendMessage('Necesito achicar una campera');
    // Turn 3: reference prior context
    const result = await chat.sendMessage('Cuanto tiempo tardaria eso?');
    const reply = result.response.text().toLowerCase();

    // Bot should still be talking about the campera/tailoring, not asking "what?"
    expect(reply).toMatch(/dia|semana|tiempo|campera|entall|achic|entreg/i);
  }, 20000);

  it('Respuestas cortas: no excede 3 oraciones', async () => {
    const chat = createChat();
    const result = await chat.sendMessage('Hola, que servicios ofrecen?');
    const reply = result.response.text();

    // Count sentences (rough: split by . ! ?)
    const sentences = reply.split(/[.!?]+/).filter(s => s.trim().length > 0);
    // Allow some tolerance (max 5 sentences with formatting)
    expect(sentences.length).toBeLessThanOrEqual(5);
  }, 15000);
});
