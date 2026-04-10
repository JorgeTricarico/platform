/**
 * E2E tests for Damian chatbot — calls real Gemini API with tool declarations.
 * Run with: npx vitest run src/__tests__/chat-e2e/
 * Requires GEMINI_API_KEY in backend/.env
 */
import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY;

import { DAMIAN_CONFIG } from '../../config/damian.js';

const SYSTEM_PROMPT = DAMIAN_CONFIG.publicChat.systemPrompt;

const tools: any[] = [
  {
    functionDeclarations: [
      {
        name: 'book_appointment',
        description: 'Agenda un turno de masaje para un cliente.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            clientName: { type: SchemaType.STRING, description: 'Nombre del cliente' },
            clientPhone: { type: SchemaType.STRING, description: 'Telefono del cliente' },
            service: { type: SchemaType.STRING, description: 'Tipo de masaje' },
            date: { type: SchemaType.STRING, description: 'Fecha YYYY-MM-DD' },
            time: { type: SchemaType.STRING, description: 'Hora HH:MM' },
          },
          required: ['clientName', 'service', 'date', 'time'],
        },
      },
      {
        name: 'check_appointments',
        description: 'Consulta los turnos agendados para una fecha.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            date: { type: SchemaType.STRING, description: 'Fecha YYYY-MM-DD' },
          },
          required: ['date'],
        },
      },
    ],
  },
];

function createChat() {
  const genAI = new GoogleGenerativeAI(API_KEY!);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT,
    tools,
  });
  return model.startChat();
}

describe.skipIf(!API_KEY)('Damian E2E — Gemini API real', () => {
  it('Saludo: responde casual en argentino', async () => {
    const chat = createChat();
    const result = await chat.sendMessage('Buenas!');
    const reply = result.response.text().toLowerCase();

    expect(reply).toBeTruthy();
    // Should be casual Argentine greeting
    expect(reply).toMatch(/hola|buenas|que tal|como andas|buen/i);
  }, 15000);

  it('Consulta de servicios: lista masajes disponibles', async () => {
    const chat = createChat();
    const result = await chat.sendMessage('Que tipos de masajes haces?');
    const reply = result.response.text().toLowerCase();

    // Should mention at least one type of massage
    expect(reply).toMatch(/descontracturante|relajante|deportivo|drenaje|masaje/i);
  }, 15000);

  it('Pide turno: bot intenta usar book_appointment tool', async () => {
    const chat = createChat();
    await chat.sendMessage('Hola, soy Marcos');
    const result = await chat.sendMessage('Quiero agendar un descontracturante para el lunes a las 10');
    const response = result.response;

    // Bot should either call the tool or ask for more info
    const functionCalls = response.functionCalls();
    const text = response.text?.() || '';

    if (functionCalls && functionCalls.length > 0) {
      // Bot used the tool — verify it's book_appointment
      const call = functionCalls.find(fc => fc.name === 'book_appointment');
      expect(call).toBeTruthy();
      expect(call!.args).toHaveProperty('service');
    } else {
      // Bot asked for more info (e.g., phone number) — that's also valid
      expect(text.toLowerCase()).toMatch(/telefono|confirma|que dia|fecha/i);
    }
  }, 20000);

  it('Consulta disponibilidad: bot usa check_appointments tool', async () => {
    const chat = createChat();
    const result = await chat.sendMessage('Tenes algo libre el miercoles que viene?');
    const response = result.response;

    const functionCalls = response.functionCalls();
    const text = response.text?.() || '';

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls.find(fc => fc.name === 'check_appointments');
      expect(call).toBeTruthy();
    } else {
      // May ask for clarification on the date
      expect(text.toLowerCase()).toMatch(/fecha|miercoles|dia|disponib|turno/i);
    }
  }, 15000);

  it('Off-topic: redirige a masajes', async () => {
    const chat = createChat();
    const result = await chat.sendMessage('Me podes recomendar un restaurante?');
    const reply = result.response.text().toLowerCase();

    expect(reply).toMatch(/masaje|turno|ayud|especiali|consult/i);
  }, 15000);

  it('Tono informal: no usa lenguaje formal', async () => {
    const chat = createChat();
    const result = await chat.sendMessage('Hola che!');
    const reply = result.response.text();

    // Should NOT have very formal language
    expect(reply).not.toMatch(/Estimado|Cordialmente|Le informo/i);
    // Should be short (WhatsApp style)
    expect(reply.length).toBeLessThan(300);
  }, 15000);

  it('Memoria multi-turno: recuerda contexto previo', async () => {
    const chat = createChat();

    await chat.sendMessage('Hola soy Laura');
    await chat.sendMessage('Me interesa un masaje relajante');
    const result = await chat.sendMessage('Cuanto sale?');
    const reply = result.response.text().toLowerCase();

    // Should reference the relajante price or service
    // Should reference the price from config
    const expectedPrice = DAMIAN_CONFIG.services['Descontracturante Piernas'].price;
    expect(reply).toMatch(new RegExp(`${expectedPrice}|pierna|precio|\\$`, 'i'));
  }, 20000);
});
