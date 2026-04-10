# L1: WhatsApp Cloud API — Bot IA con acciones de agente

> Reemplaza L1-whatsapp-baileys.md. Se descartó Baileys por riesgo de baneo.
> Documentación completa: `docs/integrations/`

## Problemática

Los chatbots de IA (Zenko "Ana", MG Masajes "Damian") solo funcionan en la web demo. Para ser útiles en producción necesitan conectarse al WhatsApp real de cada negocio, respondiendo automáticamente y ejecutando acciones (agendar turnos, consultar pedidos) que persisten en la base de datos.

## Decisión de arquitectura

**WhatsApp Cloud API (Meta oficial)** en lugar de Baileys porque:
- Baileys viola los términos de servicio de Meta y puede banearse
- Cloud API es oficial, estable, y el costo es casi $0 para chatbots reactivos
- No requiere BSP intermediario (360Dialog, Twilio) → integración directa con Meta

## Implementación

Ver guía completa en `docs/integrations/WHATSAPP-CLOUD-API-SETUP.md`.

### Archivos a crear/modificar

| Archivo | Cambio |
|---|---|
| `backend/src/services/whatsapp-cloud.ts` | NUEVO — sendCloudMessage(), parseIncomingWebhook() |
| `backend/src/routes/whatsapp.ts` | MODIFICAR — agregar GET y POST /webhook |
| `backend/.env.example` | MODIFICAR — agregar variables WHATSAPP_* |

### Archivos que NO cambian

- `backend/src/routes/chat-zenco.ts` — sin cambios
- `backend/src/routes/chat-mg_masajes.ts` — sin cambios
- `backend/src/services/ai-chat.ts` — sin cambios
- `backend/prisma/schema.prisma` — sin cambios (ya tiene ChatMessage)

## Costo estimado

- **WhatsApp API (Meta):** $0–3/mes para chatbot reactivo (service messages gratis)
- **LLM (Gemini):** $0–5/mes
- **Hosting:** ya cubierto por plan Render actual
- **Total incremental:** ~$0–8/mes por negocio

Ver análisis completo en `docs/integrations/WHATSAPP-PRICING-SAAS.md`.

## Criterio de aceptación

- Un mensaje enviado al número WhatsApp del negocio llega al chatbot
- El chatbot (Gemini) genera respuesta usando contexto real del negocio
- La respuesta llega al cliente por WhatsApp en menos de 10 segundos
- Si el flujo incluye agendar turno (MG Masajes): el turno queda en DB
- Si el flujo incluye consultar prenda (Zenko): el estado llega correcto
- El historial de conversación persiste entre sesiones por número de teléfono

## Setup requerido (fuera del código)

- [ ] Meta Business Account verificada (2–5 días hábiles)
- [ ] Número de teléfono nuevo por negocio (SIM o virtual)
- [ ] App en Meta for Developers con producto WhatsApp
- [ ] Display name aprobado por Meta
- [ ] Sistema User con token permanente

## Notas

- Cada negocio (Zenko, MG Masajes) necesita su propio número de teléfono
- El webhook puede ser compartido (un endpoint, diferencia por `phone_number_id`)
- El sessionId para WhatsApp es `whatsapp:{número}` para mantener historial por cliente
- Para testing local usar ngrok antes de deployar en Render
