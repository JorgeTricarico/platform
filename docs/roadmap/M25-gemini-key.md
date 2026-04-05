# M25: Renovar Gemini API Key

## Problematica
La API key de Gemini en backend/.env tiene cuota free-tier agotada (limit: 0 en gemini-2.0-flash). Todas las llamadas al chat fallan con 429 RESOURCE_EXHAUSTED.

## Contexto
El chat demo (ChatDemo.tsx) y el agente IA (Agent.tsx) dependen de Gemini para funcionar. El backend tiene catch blocks que retornan fallback messages, pero si el frontend no puede conectar al backend (ej: URLs de localhost en deploy), se ve "Ups, tuve un problema".

## Implementacion propuesta
1. Generar nueva API key en https://aistudio.google.com/ o habilitar billing en Google Cloud
2. Actualizar GEMINI_API_KEY en backend/.env
3. Actualizar la key en Render environment variables
4. Opcional: agregar un health check endpoint que verifique que la key funciona
5. Opcional: agregar rate limiting propio para no agotar cuota

## Criterio de aceptacion
- Chat demo y Agent funcionan correctamente
- E2E tests de chat pasan

## Notas
Los .env del frontend apuntan a localhost:3000. Para deploy en Render, necesitan apuntar a la URL del backend en Render.
