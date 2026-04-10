# Costos de IA y Selección de LLM

> Análisis de costos reales de APIs de LLM para el sistema de chatbot, con recomendación de modelo y proyección de escala.

**Última actualización:** Abril 2026

---

## El sistema de fallback actual

```
Gemini 2.0 Flash → Mistral → Cerebras → Sambanova
```

**Problema inmediato:** Gemini 2.0 Flash se apaga el 1 de junio de 2026. Hay que migrar a `gemini-2.5-flash` o `gemini-2.5-flash-lite` antes de esa fecha.

---

## Precios de los proveedores actuales (USD por millón de tokens)

| Proveedor / Modelo | Input /M | Output /M | Free tier |
|---|---|---|---|
| **Gemini 2.5 Flash-Lite** | $0.10 | $0.40 | 1,000 req/día |
| **Gemini 2.5 Flash** | $0.30 | $2.50 | 250 req/día |
| **Mistral Small 3.1** | $0.03 | $0.11 | Solo experimentación, no producción |
| **Mistral Nemo** | $0.02 | $0.04 | Solo experimentación |
| **Cerebras Llama 8B** | $0.10 | $0.10 | 1M tokens/día (generoso) |
| **Sambanova Llama 70B** | $0.60 | $1.20 | 20 req/día — inútil en producción |
| **Claude Haiku 4.5** | $1.00 | $5.00 | No |
| **Claude Sonnet 4.6** | $3.00 | $15.00 | No |
| **GPT-4o mini** | $0.15 | $0.60 | No |

---

## Costo por conversación (estimado 750 tokens: 350 input + 400 output)

| Modelo | Costo por conversación |
|---|---|
| Gemini 2.5 Flash-Lite | $0.000195 |
| Gemini 2.5 Flash | $0.000105 + $0.001 = ~$0.0011 |
| Cerebras Llama 8B | $0.000075 |
| Mistral Nemo | $0.000023 |
| Claude Haiku 4.5 | $0.0023 |
| GPT-4o mini | $0.00029 |

---

## Proyección de costos mensuales (solo LLM, paid tier)

| Escala | Gemini 2.5 Flash | Gemini Flash-Lite | Cerebras | Claude Haiku |
|---|---|---|---|---|
| 100 conv (1 negocio) | $0.11 | $0.02 | $0.01 | $0.23 |
| 500 conv (5 negocios) | $0.54 | $0.10 | $0.04 | $1.15 |
| 2,000 conv (20 negocios) | $2.15 | $0.39 | $0.15 | $4.60 |
| 10,000 conv (100 negocios) | $10.75 | $1.95 | $0.75 | $23.00 |

**Conclusión:** el costo de LLM es casi irrelevante para escala pequeña-mediana. A 20 negocios, incluso el modelo más caro de esta lista (Claude Haiku) cuesta menos de $5/mes.

---

## ¿Cuándo se rompen los free tiers?

### Gemini 2.5 Flash (250 req/día free)
- 1 negocio, 100 conv/mes = ~3.3 req/día → **free alcanza**
- 5 negocios, 500 conv/mes = ~17 req/día → **free alcanza**
- 20 negocios, 2,000 conv/mes = ~67 req/día → **free alcanza**
- 40 negocios, 4,000 conv/mes = ~133 req/día → **free alcanza**
- 80 negocios, 8,000 conv/mes = ~267 req/día → **free se rompe aquí**

### Cerebras (1M tokens/día free)
- 2,000 conv/mes × 750 tokens = 50K tokens/día
- Free aguanta hasta ~20M tokens/mes = ~26,000 conversaciones/mes
- Prácticamente inagotable para la escala actual

### Sambanova (20 req/día free)
→ **Eliminar del fallback en producción.** Es inviable.

---

## Latencia artificial: por qué NO importa la velocidad del modelo

El chatbot simula una persona real respondiendo por WhatsApp. Una respuesta instantánea rompe la ilusión. La experiencia ideal es:

```
Cliente envía mensaje
    → 1-3 segundos de "tipeo" (WhatsApp muestra "escribiendo...")
    → Llega la respuesta
```

**Esto significa:**
- La latencia del modelo no es un diferenciador
- Cerebras (ultra-rápido, 2,200 tokens/seg) no tiene ventaja sobre Gemini
- Se puede agregar un `setTimeout(delay, 1500 + Math.random() * 2000)` antes de enviar
- El modelo puede tomarse 3-5 segundos en responder sin que el usuario lo perciba como lento

**Impacto en arquitectura:** se puede usar cualquier modelo sin penalizar UX.

---

## ¿WhatsApp tiene su propia IA integrada?

**Meta AI** está integrado en WhatsApp personal (el botón azul en los chats). No es una API que puedas controlar programáticamente para tus bots. Es para usuarios finales, no para desarrolladores.

Para automatización de negocios, Meta **no ofrece** un servicio de IA en la Cloud API. Tenés que traer tu propio LLM. Meta solo provee el canal de mensajería.

Hay servicios de terceros que combinan WhatsApp + IA (Wati, Respond.io, Interakt), pero cobran $49-$299/mes y no podés personalizar la lógica de agente (function calling a tu DB).

---

## Recomendación de modelo para producción

### Opción A: Gemini 2.5 Flash (recomendada)

**Por qué es la elección correcta:**
- Multimodal (puede procesar imágenes — útil para fotos de prendas en Zenko)
- Contexto largo (1M tokens) — jamás se queda sin contexto de conversación
- Function calling nativo y confiable
- Free tier de 250 req/día cubre hasta ~80 negocios pequeños
- Paid es baratísimo ($0.30/$2.50 por M tokens)
- Es el modelo principal actual del proyecto, ya probado

**No usar Gemini 2.5 Flash-Lite para producción** aunque sea más barato: la diferencia de calidad en razonamiento de agente (function calling, contexto de conversación) es notoria.

### Opción B: Claude Haiku 4.5 (si Gemini falla constantemente)

**Por qué considerarlo:**
- Más confiable en function calling complejo (menos alucinaciones)
- Mejor seguimiento de instrucciones del system prompt
- Respuestas más naturales en español
- El costo de $4.60/mes para 20 negocios es completamente absorbible

**Cuándo pasarse a Haiku:**
- Si aparecen quejas de clientes porque el bot "no entiende"
- Si el function calling falla frecuentemente (agenda el turno mal, cancela el incorrecto)
- Si el bot se sale del rol o da información incorrecta

### Sistema de fallback recomendado para producción

```
Gemini 2.5 Flash         ← primario (calidad + free tier generoso)
    → Claude Haiku 4.5   ← fallback (si Gemini falla o se agota)
    → Cerebras Llama 8B  ← fallback de emergencia (gratis, 1M tokens/día)
```

Sacar Mistral y Sambanova del stack: Mistral no tiene free tier claro, Sambanova tiene 20 req/día inútiles.

---

## Métricas de tokens por cliente

Para trackear el gasto de IA por negocio, agregar a cada conversación:

```typescript
// En ai-chat.ts, después de la respuesta
const usage = {
  tenantId: 'zenko' | 'mg_masajes',
  sessionId,
  inputTokens: response.usageMetadata?.promptTokenCount,
  outputTokens: response.usageMetadata?.candidatesTokenCount,
  model: 'gemini-2.5-flash',
  timestamp: new Date(),
};
// Guardar en DB tabla token_usage
```

Con esto podés:
- Ver cuánto gasta cada cliente en tokens por mes
- Detectar conversaciones anómalas (loops infinitos, prompts inyectados)
- Facturar el costo de IA a cada cliente si querés desglosarlo

---

## Resumen ejecutivo de costos IA

| Escala | Costo LLM/mes | Fuente |
|---|---|---|
| 1-5 negocios (<500 conv/mes) | **$0** (free tier Gemini) | Free |
| 5-40 negocios (hasta 4,000 conv/mes) | **$0** (free tier Gemini alcanza) | Free |
| 40-100 negocios | **$2-11/mes** (Gemini paid) | Muy bajo |
| 100+ negocios | **$10-50/mes** (escala lineal) | Aun bajo |

**El LLM no es el costo dominante del sistema.** El hosting y el soporte son la inversión real.
