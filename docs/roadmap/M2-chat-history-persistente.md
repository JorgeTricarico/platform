# M2: Chat History Persistente

## Problematica

El historial de chat con el agente IA se pierde al recargar la pagina. El agente no tiene memoria de conversaciones anteriores, lo que obliga al usuario a repetir contexto en cada sesion y hace inutil el concepto de "asistente" para tareas que requieren seguimiento.

## Contexto

El chat IA esta implementado en el frontend con estado local (React state). Cada vez que el componente se desmonta o la pagina se recarga, el historial desaparece. El backend no persiste mensajes. Para que el agente recuerde conversaciones previas, los mensajes deben almacenarse en base de datos y cargarse al abrir el chat.

## Implementacion propuesta

- Crear modelo `ChatMessage` con campos: `id`, `business` (tenant), `userId` o `clientId`, `role` (`user` | `assistant`), `content`, `sessionId`, `createdAt`.
- Endpoints:
  - `GET /api/{business}/chat/history?sessionId=` — devuelve mensajes de una sesion.
  - `POST /api/{business}/chat/message` — guarda un mensaje individual.
- Al abrir el chat, cargar el historial de la sesion activa desde la API.
- Al enviar/recibir mensajes, persistir cada uno inmediatamente.
- `sessionId` puede ser un UUID generado por sesion de navegador (localStorage) o por fecha del dia.
- Pasar el historial al contexto del LLM en cada llamada para que el agente "recuerde".

## Criterio de aceptacion

- Cerrar el chat y volver a abrirlo (o recargar la pagina) muestra los mensajes anteriores.
- El agente responde con conciencia del contexto previo de la conversacion.
- El historial esta asociado al negocio correcto (no se mezclan chats entre tenants).

## Notas

- Definir politica de retencion: cuantos mensajes/dias guardar por defecto.
- Para MVP, una sesion por dia es suficiente (sessionId = fecha YYYY-MM-DD + businessId).
- Si el volumen de mensajes crece, considerar paginacion en el endpoint de historial.
- Alternativa liviana: persistir en localStorage con TTL — evita la DB pero no es multi-dispositivo.
