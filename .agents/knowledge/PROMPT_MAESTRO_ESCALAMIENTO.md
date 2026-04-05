# Prompt Maestro: Escalamiento Profesional de Zenko AaaS

> Este documento captura las decisiones clave de la investigacion de arquitectura para cuando el proyecto escale a nivel profesional con VPS y servicios pagos.

---

## 1. Arquitectura Profesional (Target)

```
[WhatsApp Cloud API] --> [n8n Orquestador] --> [PostgreSQL] --> [Dashboard React]
                              |
                         [LLM: Gemini/GPT]
                              |
                         [Google Calendar API]
```

- **VPS recomendado**: Hetzner CPX22 (2vCPU, 4GB RAM, 80GB NVMe) por ~$9.50/mes (60% mas barato que DigitalOcean $24)
- **Multi-tenant**: Un VPS con multiples Docker containers, uno por cliente
- **Orquestacion**: n8n (open source, self-hosted) para flujos de WhatsApp sin codigo boilerplate

---

## 2. Migracion de Baileys a WhatsApp Cloud API

**Cuando**: Cuando haya presupuesto para Meta Business verification.

**Por que migrar**:
- Baileys es no-oficial, riesgo de baneo permanente del numero
- Consume mucha RAM (headless browser)
- Requiere re-autenticacion manual frecuente
- Cloud API tiene 99.9% uptime garantizado

**Costo de Cloud API**:
- Mensajes de servicio (iniciados por usuario): GRATIS durante 24hs
- Mensajes de marketing (iniciados por empresa): ~$0.06-0.09 USD c/u para Argentina
- Mensajes de utilidad (confirmaciones, recordatorios): ~$0.01-0.03 USD c/u

**Implicacion clave**: Si el paciente inicia el chat, toda la conversacion (triage, agendamiento, confirmacion) es GRATIS. Solo se paga al enviar recordatorios proactivos.

---

## 3. Modelo de Precios para Clientes

| Tipo | Setup Fee (USD) | Abono Mensual (USD) | Descripcion |
|------|----------------|---------------------|-------------|
| Basico (reglas) | $0-200 | $15-50 | Flujos predefinidos, sin NLP |
| IA Generativa | $200-1,000 | $50-200 | NLP, consultas calendario, triage |
| Enterprise | $2,000-10,000+ | $500-5,000+ | Multi-sucursal, integracion HIS/CRM |

**Justificacion ROI**: Atencion manual de 500 consultas/mes cuesta ~$1,250 USD. Automatizar 70% = ahorro de $10,500 USD anuales para la clinica.

---

## 4. Costos Variables por Interaccion

### Tokens de IA (por millon de tokens):
| Modelo | Input | Output | Ventaja |
|--------|-------|--------|---------|
| Gemini 1.5 Flash | $0.075 | $0.30 | 50% mas barato, ventana 1M tokens |
| GPT-4o-mini | $0.150 | $0.60 | Mejor function calling/JSON |
| Claude Haiku | $1.00 | $5.00 | Velocidad extrema, mas caro |

**Recomendacion**: Gemini Flash para conversaciones generales, GPT-4o-mini para tool calling critico (agendamiento).

### Google Calendar API:
- Limite: 1,000,000 queries/dia (holgado)
- **Peligro**: Rate limiting por minuto (rafagas). Implementar exponential backoff obligatorio.
- **Anti-spam**: >100K eventos en poco tiempo = bloqueo de horas/meses
- **Requisito**: Google Workspace pago (no Gmail gratis) para relajar limites. Minimo 60 dias + $100 USD facturados.

---

## 5. Fiscal Argentina (Abril 2026)

Al pagar servicios cloud desde Argentina:

**Multiplicador sobre dolar oficial**: 1.53x

Compuesto por:
- Percepcion Ganancias/Bienes Personales: 30%
- IVA servicios digitales: 21%
- IIBB (Prov. Buenos Aires): 2%

**Ejemplo**: Hetzner $9.50 USD = $9.50 x 1.53 = ~$14.54 USD real = ~ARS $26,550 (al dolar tarjeta ~$1,826)

**Nota**: El Impuesto PAIS (30%) fue eliminado en enero 2026.

---

## 6. QA y Anti-Alucinaciones (Sistema Medico)

### System Prompt obligatorio para sector salud:
1. **Identidad estricta**: "Eres SOLO asistente de recepcion de [Clinica]. Tu unica funcion es agendar turnos."
2. **Prohibicion de fabricacion**: "NUNCA inventes precios, horarios, tratamientos ni diagnosticos."
3. **Desvio medico**: "Si preguntan por sintomas o medicacion, deriva a consulta presencial."
4. **Umbral de confianza**: "Si tu confianza es <95%, declara incertidumbre explicitamente."
5. **Validacion**: "No confirmes citas sin que el paciente valide nombre, fecha, hora y servicio."

### Arquitectura RAG (futuro):
- Vectorizar catalogo de servicios, precios y horarios de la clinica
- Inyectar como contexto en cada llamada al LLM
- El modelo SOLO responde basandose en datos verificados, no en su entrenamiento

### Bot Court (QA automatizado):
- Un segundo modelo audita los logs del chatbot principal
- Cruza respuestas vs base documental
- Detecta patrones de alucinacion y alerta

---

## 7. Integraciones CRM Argentinas

Para escalar al mercado de salud/estetica:
- **AgendaPro**: Reservas online, recordatorios
- **Doctoralia/Flowww**: Gestion clinica
- **MedicAI, Bilog, DrApp**: Software medico local con facturacion ARCA (ex AFIP)

Requisitos legales para software medico en Argentina:
- Facturacion electronica ARCA (WSFE)
- Historia Clinica Electronica inmutable (Ley 26.529)
- Receta electronica (Ley 27.553)
- Proteccion de datos (Ley 25.326)

---

## 8. Stack Profesional Recomendado

```
Frontend:  React + Vite + TypeScript (ya implementado)
Backend:   Express + Prisma + PostgreSQL (ya implementado)
Bot:       WhatsApp Cloud API + Gemini/GPT function calling
Orquesta:  n8n (self-hosted en Docker)
DB:        PostgreSQL (Supabase free -> Hetzner managed)
Deploy:    Render free -> Hetzner VPS con Docker Compose
Cache:     Redis (para sesiones de conversacion)
Monitor:   Grafana + Prometheus (metricas del bot)
```

---

## 9. Checklist de Migracion a Produccion

- [ ] Registrar dominio zenco.arg
- [ ] Contratar Hetzner CPX22 (~$9.50/mes)
- [ ] Migrar DB de Supabase a PostgreSQL en Hetzner
- [ ] Configurar Docker Compose multi-tenant
- [ ] Verificar negocio en Meta Business (para Cloud API)
- [ ] Migrar bot de Baileys a WhatsApp Cloud API
- [ ] Contratar Google Workspace ($6/mes/usuario)
- [ ] Integrar Google Calendar API con exponential backoff
- [ ] Implementar RAG con vectorizacion de catalogos
- [ ] Configurar n8n para orquestar flujos
- [ ] Configurar SSL/TLS con Let's Encrypt
- [ ] Configurar backups automaticos de PostgreSQL
- [ ] Landing page de venta del servicio
