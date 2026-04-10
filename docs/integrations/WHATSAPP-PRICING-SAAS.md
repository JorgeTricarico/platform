# WhatsApp Cloud API — Precios y Modelo SaaS

> Análisis de costos reales para fijar el precio del servicio de chatbot IA con WhatsApp a clientes.

**Última actualización:** Abril 2026
**Fuentes:** developers.facebook.com, flowcall.co, businesschat.io/es (Argentina)

---

## Modelo de billing de Meta (desde julio 2025)

> Meta cambió en julio 2025 de cobrar **por conversación** a cobrar **por mensaje individual** (solo templates).

### Tipos de mensaje y su costo (Argentina, USD)

| Tipo | Costo/mensaje | Cuándo aplica |
|---|---|---|
| **Service** | **$0.00 — GRATIS** | Respuesta libre al cliente dentro de 24h de que él escribió primero |
| **Utility (dentro ventana 24h)** | **$0.00 — GRATIS** | Template de confirmación/estado enviado mientras hay ventana activa |
| **Utility (fuera ventana)** | **$0.026** | Ej: recordatorio proactivo al día siguiente |
| **Marketing** | **$0.0618** | Promos, descuentos, campañas |
| **Authentication** | **$0.026** | OTP, verificación de código |

### La regla más importante

**Ventana de servicio de 24 horas:** cuando un cliente escribe al negocio, se abre una ventana de 24 horas durante la cual todos los mensajes del bot son **gratuitos** (service messages). Esto aplica al 100% del caso de uso de chatbot reactivo.

---

## Caso de uso real: Zenko + MG Masajes

### Zenko (taller de ropa)
Un cliente escribe "¿está lista mi campera?" → el bot responde con estado de la prenda → el cliente responde → bot continúa la conversación.

Todo ese flujo = service messages = **$0.00**

### MG Masajes (turnos)
Un cliente escribe "quiero sacar turno para el martes" → bot responde con disponibilidad → cliente elige horario → bot confirma y guarda en DB.

Todo ese flujo = service messages = **$0.00**

**El único costo aparece si el negocio envía recordatorios o promos proactivos** (sin que el cliente haya escrito primero en las últimas 24h).

---

## Estimación de costos mensuales

### Escenario típico: negocio pequeño con 200 conversaciones/mes

| Componente | Cantidad | Costo USD/mes |
|---|---|---|
| Service messages (chatbot reactivo) | ~180 conv. | **$0** |
| Recordatorios de turno (utility, proactivo) | ~40 mensajes | **$1.04** |
| Promos mensuales (marketing) | ~20 mensajes | **$1.24** |
| **Subtotal WhatsApp API (Meta)** | | **~$2–3** |
| LLM — Gemini 2.5 Flash (free tier cubre hasta 40 negocios) | ~200 conv. | **$0** |
| Hosting (Hetzner CX32 + Coolify / 15 clientes) | 1 servicio | **€0.55** |
| Base de datos (Supabase free tier por proyecto) | | **$0** |
| **TOTAL COSTO TÉCNICO** | | **~€1–4/mes por cliente** |

> Detalles de hosting en `INFRA-DOCKER-POR-CLIENTE.md`. Detalles de LLM en `AI-COSTS-LLM-SELECTION.md`.

### Escenario agresivo: 500 conversaciones/mes + campañas

| Componente | Costo USD/mes |
|---|---|
| WhatsApp API (100 mensajes marketing) | $6.18 |
| LLM (Gemini 2.5 Flash paid, ~500 conv.) | ~$0.54 |
| Hosting (Hetzner CX32 prorrateado) | €0.55 |
| **TOTAL** | **~$7–8/mes por cliente** |

---

## ¿Necesito un BSP (Business Solution Provider)?

**No.** Desde 2022, Meta permite conectarse directamente a la Cloud API sin intermediarios.

| | Meta Cloud API directo | BSP (360Dialog, Twilio, etc.) |
|---|---|---|
| Costo mensual plataforma | **$0** | $49–$299/mes |
| Markup en mensajes | **Sin markup** | Algunos agregan 20% |
| Integración | Webhook propio | Más fácil de montar |
| Para SaaS propio | **Ideal** | Innecesario |

**Para esta plataforma (SaaS con control propio del webhook): Meta directo es la opción correcta.**

---

## Modelo de precios para cobrar al cliente

### Estructura de costos por cliente/negocio

```
Costo técnico real (Coolify + Gemini free + Supabase free):   ~€1–4/mes
Costo técnico real (Fly.io + Gemini paid):                    ~$6–8/mes
Margen operativo sugerido:                                     10–20x
```

### Propuesta de precios (en ARS o USD)

| Plan | Incluye | Precio sugerido USD/mes |
|---|---|---|
| **Starter** | Bot reactivo, hasta 200 conv./mes, sin recordatorios | **$29** |
| **Pro** | Bot reactivo + recordatorios automáticos, hasta 500 conv. | **$59** |
| **Business** | Todo + campañas marketing, multi-número, analytics | **$99** |

### Consideraciones para fijar precio en Argentina

- El costo de WhatsApp API es en USD, así que el precio al cliente debería estar indexado al dólar (oficial o blue).
- Si cobrás en ARS, revisar el precio mensualmente según el tipo de cambio.
- Un turno agendado vía WhatsApp tiene un valor concreto para el negocio (vs atención manual). Podés argumentar ROI: "si el bot agenda 10 turnos/mes que antes se perdían, ya se paga solo".

---

## Comparativa con alternativas

| Alternativa | Costo mensual | Limitaciones |
|---|---|---|
| **Esta plataforma (Meta directo)** | $9–13 técnico | Setup inicial complejo |
| Baileys (WhatsApp Web unofficial) | $0 | Puede banearse, no producción |
| Wati / Respond.io | $49–299 (plataforma) + mensajes | No customizable, no IA propia |
| Interakt | $30–200 | Similar a Wati |
| Twilio WhatsApp | $0 plataforma + $0.05/msg extra | Más caro en mensajes |

---

## Próximos pasos para monetizar

1. Implementar la integración Cloud API (ver `WHATSAPP-CLOUD-API-SETUP.md`)
2. Definir onboarding: el cliente trae su número o le damos uno virtual
3. Agregar tabla `whatsapp_accounts` en DB para multi-tenant (número por negocio)
4. Dashboard de uso: conversaciones del mes, mensajes de IA, acciones ejecutadas
5. Billing: integrar con Stripe o MercadoPago para cobro automático mensual
