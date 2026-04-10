# WhatsApp Cloud API — Guía de Configuración

> Guía para conectar la lógica de IA existente (chat-zenco, chat-mg_masajes) al WhatsApp oficial de cada negocio usando Meta Cloud API.

## Por qué Cloud API y no Baileys

| | Baileys (descartado) | Cloud API (este doc) |
|---|---|---|
| Oficial Meta | No | Sí |
| Riesgo de baneo | Alto | Ninguno |
| Estabilidad | Baja | Alta |
| Costo setup | 0 | 0 |
| Costo mensajes | 0 | ~$0–5/mes para chatbots reactivos |
| Requiere BSP | No | No (Meta directo) |
| Producción | No recomendado | Sí |

---

## Requisitos previos

1. **Número de teléfono nuevo** — no vinculado a ninguna cuenta WhatsApp personal ni de empresa. Puede ser un chip SIM o un número virtual.
2. **Meta Business Manager** — cuenta en business.facebook.com con identidad de negocio verificada.
3. **App en Meta for Developers** — tipo "Business", producto WhatsApp agregado.
4. **Servidor con HTTPS** — el webhook de Meta requiere HTTPS. En Render ya está cubierto.

---

## Paso a paso: configurar Meta

### 1. Crear Meta Business Account
- Ir a https://business.facebook.com
- Completar verificación de negocio (puede tomar 2–5 días hábiles)

### 2. Crear App en Meta for Developers
- Ir a https://developers.facebook.com/apps
- Crear app → tipo **Business**
- Agregar producto **WhatsApp**

### 3. Registrar el número de teléfono
- En la app → WhatsApp → Configuration
- Agregar número → verificar con OTP por SMS o llamada
- El número queda en estado "Connected"

### 4. Generar Access Token permanente
- En Business Settings → System Users → crear System User con rol Admin
- Asignar el activo de la app WhatsApp al System User
- Generar token permanente (never expires) con permisos:
  - `whatsapp_business_messaging`
  - `whatsapp_business_management`

### 5. Configurar webhook
- En la app → WhatsApp → Configuration → Webhooks
- URL: `https://TU-DOMINIO.render.com/api/whatsapp/webhook`
- Verify Token: el valor de `WHATSAPP_WEBHOOK_TOKEN` en tu `.env`
- Subscribir a eventos: `messages`

---

## Variables de entorno

Agregar a `backend/.env` (y a Render environment variables):

```bash
# WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN=EAAxx...         # Token del System User
WHATSAPP_PHONE_NUMBER_ID=10201234567   # ID del número en Meta (no el número en sí)
WHATSAPP_BUSINESS_ACCOUNT_ID=109876    # ID del WhatsApp Business Account
WHATSAPP_WEBHOOK_TOKEN=secreto_random  # Token que vos elegís para validar webhook
WHATSAPP_API_VERSION=v21.0             # Versión de la Graph API
```

---

## Arquitectura de la integración

```
Cliente WhatsApp
      │
      ▼
Meta Cloud API
      │  (webhook POST con JSON)
      ▼
POST /api/whatsapp/webhook
      │
      ├── Validar X-Hub-Signature-256
      ├── Parsear: from, text, messageId
      ├── Deduplicar por messageId
      │
      ├── Si negocio = Zenko → POST /api/zenco/chat (interno)
      │                              │
      │                              └── chat-zenco.ts → Gemini AI → respuesta
      │
      └── Si negocio = MG Masajes → POST /api/mg_masajes/chat (interno)
                                           │
                                           └── chat-mg_masajes.ts → Gemini AI
                                                  │
                                                  ├── book_appointment → DB
                                                  ├── cancel_appointment → DB
                                                  └── reschedule_appointment → DB
      │
      ▼
sendCloudMessage(from, respuesta)
      │
      ▼
Meta Cloud API → WhatsApp del cliente
```

**Clave:** `chat-zenco.ts` y `chat-mg_masajes.ts` no cambian. Solo se agrega el webhook que los llama.

---

## Implementación mínima en el backend

### Nuevo servicio: `backend/src/services/whatsapp-cloud.ts`

```typescript
const GRAPH_URL = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION}`;

export async function sendCloudMessage(to: string, text: string): Promise<void> {
  await fetch(`${GRAPH_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
}

export function parseIncomingWebhook(body: any): { from: string; text: string; messageId: string } | null {
  const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg || msg.type !== 'text') return null;
  return {
    from: msg.from,          // "5491134567890"
    text: msg.text.body,
    messageId: msg.id,
  };
}
```

### Nuevo endpoint: agregar en `backend/src/routes/whatsapp.ts`

```typescript
// GET — Meta verifica el webhook al configurarlo
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_TOKEN) {
    res.send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// POST — Meta envía mensajes entrantes aquí
router.post('/webhook', async (req, res) => {
  // Responder 200 inmediato (Meta requiere < 30s)
  res.sendStatus(200);

  const parsed = parseIncomingWebhook(req.body);
  if (!parsed) return;

  const { from, text, messageId } = parsed;

  // Deduplicar: Meta puede re-enviar el mismo mensaje
  if (processedMessages.has(messageId)) return;
  processedMessages.add(messageId);

  try {
    // Llamada interna al chat del negocio correspondiente
    // (determinar negocio por número de teléfono o config)
    const response = await processMessageForBusiness(from, text);
    await sendCloudMessage(from, response);
  } catch (err) {
    console.error('[WhatsApp webhook] Error:', err);
  }
});
```

---

## Gestión de sesiones de conversación

El `sessionId` que ya usa `chat-zenco.ts` puede generarse como `whatsapp:${from}` para mantener historial por número de teléfono:

```typescript
const sessionId = `whatsapp:${from}`;
// El historial en DB se recupera automáticamente con este sessionId
```

---

## Multi-negocio (multi-tenant)

Cuando tenés más de un negocio en la plataforma, cada uno necesita:
- Su propio número de teléfono registrado en Meta
- Su propio `PHONE_NUMBER_ID`

El webhook puede ser el mismo endpoint, diferenciando por `metadata.phone_number_id`:

```typescript
const phoneNumberId = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
if (phoneNumberId === process.env.ZENKO_PHONE_NUMBER_ID) {
  // → chat-zenco
} else if (phoneNumberId === process.env.MG_PHONE_NUMBER_ID) {
  // → chat-mg_masajes
}
```

---

## Testing local

Para testear el webhook localmente antes de deployar:

1. Instalar ngrok: `npm install -g ngrok`
2. Exponer el puerto: `ngrok http 3000`
3. Usar la URL HTTPS de ngrok como Webhook URL en Meta Developer Console
4. Verificar que los mensajes lleguen con `console.log` en el endpoint POST

---

## Checklist de go-live

- [ ] Meta Business Account verificada
- [ ] Número de teléfono registrado y verificado en Meta
- [ ] Display name aprobado por Meta
- [ ] Access token generado (System User, never expires)
- [ ] Variables de entorno en Render configuradas
- [ ] Webhook URL registrada en Meta Developer Console
- [ ] Webhook verificado exitosamente (GET funciona)
- [ ] Test con mensaje real: cliente escribe → bot responde
- [ ] Test función de agente: cliente agenda turno → queda en DB
