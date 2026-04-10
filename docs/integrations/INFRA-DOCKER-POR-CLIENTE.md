# Infraestructura: Docker Aislado por Cliente

> Arquitectura donde cada negocio cliente corre en su propio contenedor Docker, con aislamiento total de código, datos, logs y métricas.

---

## Por qué aislar por cliente

**Problema del backend compartido actual:**
- Un deploy toca a todos los clientes a la vez
- Un bug en la lógica de Zenko puede afectar a MG Masajes
- Los logs de todos los negocios se mezclan
- No hay forma de ver cuántos recursos consume cada cliente
- No se puede hacer rollback por cliente

**Con aislamiento por Docker:**
- Deploy de Zenko → solo Zenko se reinicia
- Logs separados por negocio
- Métricas de CPU/RAM por cliente
- Rollback independiente por contenedor
- Cada cliente tiene sus propias variables de entorno

---

## Arquitectura objetivo

```
                    ┌─────────────────────────────────────────┐
                    │         Reverse Proxy (Traefik/Nginx)   │
                    │  zenko.api.tudominio.com                 │
                    │  mg.api.tudominio.com                    │
                    └──────────┬──────────────┬───────────────┘
                               │              │
                    ┌──────────▼──┐    ┌──────▼──────────┐
                    │  Container  │    │   Container      │
                    │  zenko-api  │    │   mg-api         │
                    │  Port 3001  │    │   Port 3002      │
                    │  Node.js    │    │   Node.js        │
                    │  + Prisma   │    │   + Prisma       │
                    └──────────┬──┘    └──────┬───────────┘
                               │              │
                    ┌──────────▼──┐    ┌──────▼───────────┐
                    │  Supabase   │    │   Supabase        │
                    │  DB: zenko  │    │   DB: mg_masajes  │
                    │  (schema)   │    │   (schema)        │
                    └─────────────┘    └──────────────────┘
```

Cada container tiene:
- Sus propias variables de entorno (`DATABASE_URL`, `JWT_SECRET`, `WHATSAPP_*`, etc.)
- Sus propios logs
- Sus propias métricas de CPU/RAM
- Su propio dominio de API

---

## Opciones de hosting comparadas

| Plataforma | 5 clientes | 20 clientes | Docker nativo | Logs/métricas | Gestión |
|---|---|---|---|---|---|
| **Hetzner VPS + Coolify** | ~€8/mes | ~€16/mes | Sí | Por servicio | Media |
| **Fly.io** | ~$27/mes | ~$110/mes | Sí (excelente) | Por app | Baja |
| **Render** | $35/mes | $140/mes | Sí | Por servicio | Baja |
| **Railway** | ~$75/mes | ~$300/mes | Sí | Por servicio | Baja |
| **DigitalOcean App Platform** | $25/mes | $100/mes | Sí | Por servicio | Baja |

---

## Recomendación: Hetzner VPS + Coolify

### Por qué esta combinación

**Coolify** es un PaaS open-source que se instala en tu VPS. Da la experiencia de Render (UI web, deploys desde Git, SSL automático, logs por servicio) pero sobre hardware propio, pagando solo el servidor.

- Software: **gratis** (open source)
- Solo pagás el VPS: €8-16/mes para 5-20 clientes
- Aislamiento real por Docker (cada cliente = proyecto separado en Coolify)
- SSL automático con Let's Encrypt
- Reverse proxy Traefik integrado
- Variables de entorno aisladas por proyecto
- Logs streameable por servicio desde la UI

### Servidores recomendados (Hetzner Cloud)

| Servidor | RAM | CPU | Precio | Para cuántos clientes |
|---|---|---|---|---|
| CX22 | 4 GB | 2 vCPU | €4.15/mes | 1-5 clientes ligeros |
| CX32 | 8 GB | 4 vCPU | €8.20/mes | 5-15 clientes |
| CX42 | 16 GB | 8 vCPU | €16.40/mes | 15-30 clientes |
| CX52 | 32 GB | 16 vCPU | €32.00/mes | 30-60 clientes |

**Referencia:** cada container Node.js en reposo usa ~100-200 MB RAM. Un CX32 (8 GB) tiene margen cómodo para 15 backends activos + el sistema operativo + Coolify.

### Setup inicial Coolify

```bash
# En el VPS Hetzner (Ubuntu 22.04):
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Acceder a la UI: http://IP:8000
# Configurar dominio: tudominio.com apunta a la IP del VPS
# Coolify genera SSL automáticamente por Let's Encrypt
```

### Estructura de proyectos en Coolify

```
Coolify
├── Proyecto: Zenko
│   ├── Service: zenko-api (Dockerfile del backend)
│   │   ├── Env: DATABASE_URL=postgresql://...zenko
│   │   ├── Env: WHATSAPP_PHONE_NUMBER_ID=xxx
│   │   └── Domain: api.zenko.tudominio.com
│   └── Service: zenko-web (frontend React build)
│       └── Domain: app.zenko.tudominio.com
│
└── Proyecto: MG Masajes
    ├── Service: mg-api (mismo Dockerfile, distinto env)
    │   ├── Env: DATABASE_URL=postgresql://...mg_masajes
    │   ├── Env: WHATSAPP_PHONE_NUMBER_ID=yyy
    │   └── Domain: api.mg.tudominio.com
    └── Service: mg-web
        └── Domain: app.mg.tudominio.com
```

---

## Alternativa si se prefiere cero gestión: Fly.io

Fly.io permite desplegar cada cliente como una app independiente con:
- VM Firecracker aislada por app
- CLI para automatizar: `fly deploy --app zenko-api`
- Logs por app: `fly logs --app zenko-api`
- Métricas de CPU/RAM en el dashboard
- Auto-scaling por app

**Precio:** ~$5.50/mes por backend (shared-cpu-1x, 512 MB RAM + IPv4)

```bash
# Deploy de nuevo cliente desde CLI
fly apps create mg-api
fly secrets set DATABASE_URL=xxx WHATSAPP_ACCESS_TOKEN=yyy --app mg-api
fly deploy --app mg-api --dockerfile ./backend/Dockerfile
```

---

## Costo total del sistema por cliente (modelo Coolify)

```
Infraestructura (VPS Hetzner CX32 / 15 clientes):  €8 / 15 = €0.53/cliente
WhatsApp Cloud API:                                  $0-3/cliente/mes
LLM (Gemini 2.5 Flash, free tier):                  $0/cliente/mes
Supabase DB (free tier por proyecto):               $0/cliente/mes
─────────────────────────────────────────────────────────────────
Total costo técnico por cliente:                    ~€1-4/mes
```

Con un precio de $29-59/mes al cliente, el margen es del 93-97%.

---

## Métricas de gasto por cliente

### En la DB: tabla `token_usage`

```sql
CREATE TABLE token_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,  -- 'zenko', 'mg_masajes'
  session_id    TEXT,
  model         TEXT,
  input_tokens  INT,
  output_tokens INT,
  cost_usd      DECIMAL(10, 8), -- calculado en backend
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### Dashboard de costos (futuro)

Agregar en el panel de admin:
- Conversaciones del mes por cliente
- Tokens consumidos por cliente
- Costo estimado LLM por cliente
- Mensajes WhatsApp enviados (service vs utility vs marketing)

---

## Plan de migración desde el backend monolítico actual

### Fase 1 — Sin cambios de código (hoy)
Tomar el backend actual y correrlo en dos instancias con variables de entorno distintas.

```yaml
# docker-compose.yml en el VPS (o via Coolify)
services:
  zenko-api:
    build: ./backend
    environment:
      - TENANT=zenko
      - DATABASE_URL=${ZENKO_DB_URL}
      - WHATSAPP_PHONE_NUMBER_ID=${ZENKO_WA_ID}
    ports:
      - "3001:3000"

  mg-api:
    build: ./backend
    environment:
      - TENANT=mg_masajes
      - DATABASE_URL=${MG_DB_URL}
      - WHATSAPP_PHONE_NUMBER_ID=${MG_WA_ID}
    ports:
      - "3002:3000"
```

### Fase 2 — Routing en el backend por TENANT
El backend ya distingue rutas por `/api/zenco/` vs `/api/mg_masajes/`. En el modelo aislado, cada instancia solo sirve su propio tenant. Se puede agregar middleware que rechace requests para el tenant incorrecto.

### Fase 3 — DB separada por cliente (ya existe)
Supabase permite múltiples proyectos. Cada cliente tiene su propio proyecto = DB aislada. Solo hay que actualizar `DATABASE_URL` en el container correspondiente.

---

## Latencia artificial (UX real)

El bot debe parecer una persona real respondiendo por WhatsApp. No necesita responder instantáneamente — al contrario, una respuesta en 0ms se ve como spam.

Agregar en el handler del webhook antes de enviar la respuesta:

```typescript
// Simular "escribiendo..." con delay humano
const HUMAN_DELAY_MS = 1500 + Math.random() * 2500; // 1.5s - 4s
await whatsappSendTypingIndicator(from); // opcional: "escribiendo..."
await new Promise(resolve => setTimeout(resolve, HUMAN_DELAY_MS));
await sendCloudMessage(from, aiResponse);
```

Esto también desacopla la latencia del LLM de la UX: si Gemini tarda 3 segundos, el usuario igual espera el delay artificial y no percibe diferencia entre un modelo lento y uno rápido.

**Implicación para elección de modelo:** la velocidad del LLM no es un criterio. Podés elegir modelos más baratos/lentos sin penalizar la experiencia.
