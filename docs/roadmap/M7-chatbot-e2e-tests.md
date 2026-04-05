# M7: Tests E2E chatbot con API real (prompts + comportamiento)

## Problematica
Los tests actuales del chatbot usan mocks de Gemini — verifican la estructura pero no el comportamiento real del bot. Necesitamos tests que usen la API real para validar que los system prompts producen respuestas coherentes, que el bot usa las tools cuando corresponde, y que la memoria multi-turno funciona.

## Contexto
- Sesion 7: se crearon 20 tests con mocks (chat-zenco.test.ts, chat-damian.test.ts)
- Se migro Zenco de generateContent a startChat (soporte history)
- Ambos ChatDemo frontends ahora envian history para memoria multi-turno
- Repos de referencia: bibinprathap/whatsapp-chatbot (memory per-phone), vercel-labs/gemini-chatbot (Postgres history)

## Implementacion propuesta
1. Crear `backend/src/__tests__/chat-e2e/` con tests que llamen a Gemini real (requieren GEMINI_API_KEY)
2. Test scenarios:
   - **Zenko**: saludo → pregunta estado → bot pide telefono → da telefono → bot responde con datos
   - **Damian**: saludo → pide turno → bot usa book_appointment → confirma
   - **Off-topic**: pregunta no relacionada → bot redirige amablemente
   - **Memoria**: 3 turnos consecutivos donde el bot recuerda contexto previo
3. Marcar como `describe.skipIf(!process.env.GEMINI_API_KEY)` para que no rompan en CI
4. Usar los resultados para iterar sobre system prompts

## Criterio de aceptacion
- Tests pasan con API key real y verifican respuestas coherentes (no exact match, sino contains/patterns)
- System prompts iterados basados en resultados de los tests
- Documentar mejoras al prompt en la reflexion

## Notas
- Los tests E2E son lentos (~2-5s por turno) — separar del suite principal
- Considerar rate limits de Gemini API
- Alternativa futura: usar Gemini con temperature=0 para respuestas mas deterministas
