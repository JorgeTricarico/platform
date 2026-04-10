# WhatsApp + IA Agente — Arquitectura de Integración

> Cómo conectar mensajes reales de WhatsApp con la lógica de IA existente, incluyendo acciones de agente (agendar, cancelar, guardar en DB).

---

## El problema que resuelve

```
ANTES (solo demo web):
  Usuario web → ChatDemo.tsx → POST /api/zenco/chat → Gemini → respuesta en pantalla

DESPUÉS (WhatsApp real):
  Cliente WhatsApp → Meta Cloud API → webhook → POST /api/zenco/chat → Gemini → respuesta por WhatsApp
```

El código de IA (chat-zenco.ts, chat-mg_masajes.ts, ai-chat.ts) **no cambia**. Solo se agrega el gateway de entrada/salida por WhatsApp.

---

## Diagrama completo del flujo

```
                    ┌─────────────────────────────────────┐
                    │         Meta Cloud API              │
                    │   (WhatsApp oficial del negocio)    │
                    └──────────────┬──────────────────────┘
                                   │ POST webhook
                                   ▼
                    ┌─────────────────────────────────────┐
                    │  POST /api/whatsapp/webhook          │
                    │                                     │
                    │  1. Validar X-Hub-Signature-256     │
                    │  2. Parsear: from, text, messageId  │
                    │  3. Deduplicar por messageId        │
                    │  4. Resolver negocio por phoneId    │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                                         │
              ▼                                         ▼
┌─────────────────────────┐             ┌─────────────────────────┐
│  POST /api/zenco/chat   │             │ POST /api/mg_masajes/chat│
│  (chat-zenco.ts)        │             │ (chat-mg_masajes.ts)     │
│                         │             │                         │
│  - Busca cliente por    │             │  - Busca paciente        │
│    teléfono o nombre    │             │    por teléfono          │
│  - Inyecta contexto:    │             │  - Inyecta contexto:     │
│    pedidos, estado      │             │    turnos, disponibilidad│
│  - Llama Gemini AI      │             │  - Llama Gemini con      │
│  - Respuesta texto      │             │    function calling      │
└────────────┬────────────┘             └────────────┬────────────┘
             │                                       │
             │                          ┌────────────┴────────────┐
             │                          │   Function Calling       │
             │                          │                         │
             │                          ├── book_appointment      │
             │                          │     └── prisma.create() │
             │                          ├── cancel_appointment    │
             │                          │     └── prisma.update() │
             │                          └── reschedule_appointment│
             │                                └── prisma.update() │
             │                                       │
             └───────────────┬───────────────────────┘
                             │
                             ▼
                ┌────────────────────────┐
                │  sendCloudMessage()    │
                │  POST Graph API        │
                │  → WhatsApp cliente   │
                └────────────────────────┘
```

---

## Acciones de agente disponibles por negocio

### Zenko (taller de ropa)
El bot actualmente no tiene function calling, usa contexto pre-fetched:

| Acción | Cómo funciona | DB |
|---|---|---|
| Consultar estado prenda | Contexto inyectado en system prompt | Solo lectura |
| Identificar cliente | Busca por teléfono o nombre mencionado | Solo lectura |
| Registrar cliente nuevo | Auto-registro si no existe | `prisma.customer.create()` |
| Persistir conversación | Por sessionId (`whatsapp:+549...`) | `prisma.chatMessage.create()` |

### MG Masajes (turnos/masajes)
Usa function calling completo con Gemini:

| Función | Descripción | DB |
|---|---|---|
| `book_appointment` | Agenda turno con fecha, hora, servicio | `prisma.appointment.create()` |
| `cancel_appointment` | Cancela por ID de turno | `prisma.appointment.update()` |
| `reschedule_appointment` | Reprograma con check de disponibilidad | `prisma.appointment.update()` |

**El cliente puede en un mismo chat de WhatsApp:**
- Preguntar disponibilidad → bot responde con horarios libres
- Elegir horario → bot llama `book_appointment` → turno en DB
- Pedir cambio → bot llama `reschedule_appointment` → DB actualizada
- Cancelar → bot llama `cancel_appointment` → DB actualizada

---

## Gestión de historial de conversación

El historial de chat se mantiene por `sessionId`. Para WhatsApp, el sessionId es el número de teléfono del cliente:

```typescript
// En el webhook, cuando se llama internamente a /api/mg_masajes/chat:
const sessionId = `whatsapp:${from}`;  // ej: "whatsapp:5491134567890"

// chat-mg_masajes.ts ya persiste en DB con prisma.chatMessage.create()
// El historial se recupera automáticamente en la próxima llamada
```

Esto significa que si el cliente escribe hoy "quiero turno para el martes" y mañana escribe "en realidad para el miércoles", el bot tiene contexto de la conversación anterior.

---

## Deduplicación de mensajes

Meta puede re-enviar el mismo webhook si no recibe 200 OK a tiempo. Solución con Set en memoria (o Redis si hay alta concurrencia):

```typescript
const processedMessages = new Set<string>();

// En el handler del webhook:
if (processedMessages.has(messageId)) return;
processedMessages.add(messageId);
setTimeout(() => processedMessages.delete(messageId), 60_000); // TTL 60s
```

Para producción con múltiples instancias, usar Redis o guardar messageId en DB.

---

## Rate limiting y manejo de errores

### Límites de Meta
- 250 mensajes/segundo por número de teléfono (más que suficiente)
- Sin límite de mensajes service (reactivos)

### Errores comunes

| Error | Causa | Solución |
|---|---|---|
| `131030` | Número del destinatario inválido | Validar formato antes de enviar |
| `131047` | Mensaje fuera de ventana 24h | Usar template de utility aprobado |
| `131051` | Tipo de mensaje no soportado | Solo texto libre en service messages |
| `401 Unauthorized` | Token expirado | Generar nuevo System User token |

---

## Configuración multi-negocio

Cada negocio tiene su propio número y sus propias variables de entorno:

```bash
# Zenko
ZENKO_WHATSAPP_PHONE_NUMBER_ID=10201111111
ZENKO_WHATSAPP_ACCESS_TOKEN=EAAzenko...

# MG Masajes
MG_WHATSAPP_PHONE_NUMBER_ID=10202222222
MG_WHATSAPP_ACCESS_TOKEN=EAAmg...

# Webhook compartido — diferencia por phone_number_id
WHATSAPP_WEBHOOK_TOKEN=token_secreto_compartido
```

El webhook único recibe mensajes de todos los negocios y los rutea:

```typescript
const phoneNumberId = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

const BUSINESS_MAP: Record<string, string> = {
  [process.env.ZENKO_WHATSAPP_PHONE_NUMBER_ID!]: 'zenco',
  [process.env.MG_WHATSAPP_PHONE_NUMBER_ID!]: 'mg_masajes',
};

const business = BUSINESS_MAP[phoneNumberId];
```

---

## Roadmap de implementación

Ver ticket en `docs/roadmap/L1-whatsapp-cloud-api.md`.

**Orden sugerido:**
1. Setup Meta Business Account + número de prueba
2. Implementar `whatsapp-cloud.ts` (sendMessage + parseWebhook)
3. Agregar endpoints GET/POST `/api/whatsapp/webhook` en `routes/whatsapp.ts`
4. Conectar webhook → chat-mg_masajes (el más completo, function calling)
5. Test end-to-end: mensaje WhatsApp → turno en DB
6. Agregar a Zenko
7. Multi-negocio con variables de entorno por cliente
