# Evaluación de Herramientas para Arquitectura SaaS Multi-Instancia

> ¿Cómo tener templates robustos y código centralizado, pero que cada cliente sea independiente?

---

## La respuesta corta

**Refine NO sirve para este caso.** La solución correcta es:

```
Turborepo (monorepo, código compartido)  +  Coolify (deploy aislado por cliente)
```

No necesitás un framework nuevo. Necesitás reorganizar tu código actual con un monorepo y deployar cada instancia de forma independiente.

---

## ¿Qué es Refine y por qué NO aplica?

**Refine** (refine.dev) es un framework React para admin panels y CRUDs. Genera hooks y providers para data fetching, auth, routing.

**Por qué no sirve para este caso:**
- Requiere reescribir las pages/componentes para usar sus hooks (`useTable`, `useForm`, `useShow`)
- No resuelve el problema de multi-instancia (no es una herramienta de deployment)
- Tus dashboards ya están hechos con shadcn/ui y funcionan — Refine agregaría complejidad sin beneficio
- No se integra nativamente con Express+Prisma (necesita un data provider custom)
- **Es una herramienta de UI, no de arquitectura**

---

## Evaluación completa de alternativas

### Herramientas que NO resuelven el problema

| Herramienta | Qué es | Por qué no sirve |
|---|---|---|
| **Refine** | Framework React para admin panels | Reescribir UI que ya funciona; no resuelve aislamiento |
| **Payload CMS** | Headless CMS con admin UI | Requiere abandonar Prisma; migración completa del backend |
| **Directus** | CMS que genera API sobre SQL | Reemplaza Prisma; admin UI es Vue, no React |
| **Strapi** | Headless CMS popular | Sin multi-tenancy nativa; reemplaza Prisma |
| **Tooljet / Appsmith** | Plataformas low-code | Perdés control sobre UX; no es SaaS entregable |
| **T3 Stack** | Boilerplate Next.js+tRPC+Prisma | Requiere migrar de Vite+Express a Next.js completo |
| **Wasp** | Framework full-stack declarativo | Rewrite completo; ideal para proyectos nuevos, no migración |
| **SST** | Framework serverless AWS | En mantenimiento; solo AWS; no Docker |

### Herramientas que SÍ resuelven el problema

| Herramienta | Qué resuelve | Recomendación |
|---|---|---|
| **Turborepo** | Monorepo + código compartido entre clientes | **SÍ — Pieza central** |
| **Coolify** | Deploy + gestión de instancias Docker aisladas | **SÍ — Pieza de infra** |
| **AdminJS** | Admin panel auto-generado sobre Prisma | **Opcional** — útil como herramienta interna |
| **Dokku** | Mini-Heroku self-hosted (CLI only) | **Alternativa a Coolify** si preferís CLI puro |

---

## La arquitectura recomendada: Turborepo + Coolify

### Turborepo: código compartido, clientes independientes

Turborepo es un build system para monorepos. No reemplaza nada de tu stack — solo organiza el código para compartir packages entre apps.

**Estructura objetivo:**

```
Platform/
├── turbo.json                    # Config de Turborepo
├── packages/
│   ├── ui/                       # shadcn components compartidos
│   │   ├── src/
│   │   │   ├── Button.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── DataTable.tsx
│   │   │   └── GarmentModal.tsx  # Compartido entre clientes
│   │   └── package.json          # "@platform/ui"
│   │
│   ├── types/                    # TypeScript interfaces compartidas
│   │   ├── src/
│   │   │   ├── client.ts         # Client, Order, Garment, Appointment
│   │   │   ├── api.ts            # Request/Response types
│   │   │   └── chat.ts           # ChatMessage, SessionHistory
│   │   └── package.json          # "@platform/types"
│   │
│   ├── api-client/               # Cliente HTTP tipado
│   │   ├── src/
│   │   │   ├── index.ts          # createApiClient(baseUrl, token)
│   │   │   └── endpoints.ts      # getClients(), createOrder(), etc.
│   │   └── package.json          # "@platform/api-client"
│   │
│   ├── config/                   # Configuración base
│   │   ├── src/
│   │   │   ├── auth.ts           # JWT config, login logic
│   │   │   ├── theme.ts          # Colores base, spacing
│   │   │   └── business.ts       # BusinessConfig interface
│   │   └── package.json          # "@platform/config"
│   │
│   └── prisma/                   # Schema + migrations compartidas
│       ├── schema.prisma
│       ├── migrations/
│       └── package.json          # "@platform/prisma"
│
├── apps/
│   ├── backend/                  # Express API parametrizada por TENANT
│   │   ├── src/
│   │   │   ├── routes/           # Rutas genéricas (CRUD clients, orders, chat)
│   │   │   ├── services/         # ai-chat.ts, whatsapp-cloud.ts
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── web/                      # App React base (template)
│       ├── src/
│       │   ├── pages/            # Dashboard, Clients, Chat, Finances
│       │   ├── App.tsx           # Lee config del tenant para tabs/features
│       │   └── main.tsx
│       ├── Dockerfile
│       └── package.json
│
├── tenants/                      # Config específica por cliente
│   ├── zenko/
│   │   ├── config.ts             # nombre, colores, logo, tabs habilitadas
│   │   ├── prompts.ts            # System prompts de "Ana" para IA
│   │   └── features.ts           # { garments: true, appointments: false }
│   │
│   ├── mg-masajes/
│   │   ├── config.ts             # nombre, colores, logo
│   │   ├── prompts.ts            # System prompts de "Damian"
│   │   └── features.ts           # { garments: false, appointments: true }
│   │
│   └── template/                 # Template para nuevo cliente
│       ├── config.ts
│       ├── prompts.ts
│       └── features.ts
│
└── docker/
    ├── docker-compose.zenko.yml
    ├── docker-compose.mg.yml
    └── Dockerfile.backend
```

**Cómo funciona:**

```typescript
// apps/web/src/App.tsx
import { tenantConfig } from '@platform/config';

// tenantConfig se inyecta en build time o via env var
// Cada build produce un bundle distinto por tenant
const config = tenantConfig(); // { name: "Zenko", tabs: [...], theme: {...} }

return (
  <ThemeProvider colors={config.theme}>
    <TabLayout tabs={config.tabs}>
      {config.features.garments && <GarmentsPage />}
      {config.features.appointments && <AppointmentsPage />}
      <ChatPage systemPrompt={config.prompts.chat} />
    </TabLayout>
  </ThemeProvider>
);
```

### Coolify: deploy aislado por cliente

Cada tenant se deploya como un stack Docker separado en Coolify:

```
Coolify Dashboard
├── Proyecto: Zenko
│   ├── zenko-api (Docker, env: TENANT=zenko, DATABASE_URL=xxx)
│   └── zenko-web (Docker, build-arg: TENANT=zenko)
│
├── Proyecto: MG Masajes
│   ├── mg-api (Docker, env: TENANT=mg_masajes, DATABASE_URL=yyy)
│   └── mg-web (Docker, build-arg: TENANT=mg_masajes)
│
└── Proyecto: Nuevo Cliente
    └── [clonar template, setear env vars, deploy]
```

---

## Qué se comparte vs qué se customiza

| Compartido (`packages/`) | Customizado (`tenants/{name}/`) |
|---|---|
| Componentes UI (shadcn) | Colores, logo, branding |
| Tipos TypeScript | Tabs habilitadas (features flags) |
| Lógica de auth (JWT) | System prompts de IA |
| API client tipado | Nombre del negocio/bot |
| Prisma schema + migrations | Variables de entorno |
| Servicio de chat IA | WhatsApp phone number ID |
| WhatsApp Cloud service | Database URL |

---

## Crear un nuevo cliente (flujo)

```bash
# 1. Copiar template de tenant
cp -r tenants/template tenants/nuevo-cliente
# Editar config.ts, prompts.ts, features.ts

# 2. Build
turbo build --filter=@platform/backend --filter=@platform/web

# 3. Deploy en Coolify (desde la UI o API)
# - Crear proyecto "nuevo-cliente"
# - Crear servicio "nuevo-cliente-api" con Dockerfile.backend
# - Setear env vars: TENANT=nuevo_cliente, DATABASE_URL=...
# - Crear servicio "nuevo-cliente-web" con Dockerfile.web
# - Setear build-arg: TENANT=nuevo_cliente
# - Deploy → SSL automático en nuevo-cliente.tudominio.com
```

**Tiempo estimado para agregar un cliente nuevo: ~30 minutos** (crear config + deploy en Coolify).

---

## Costo de la arquitectura completa

### Para 20 clientes

| Componente | Costo/mes | Notas |
|---|---|---|
| VPS Hetzner CX42 (16 GB, 8 vCPU) | €16.40 | 20 backends + 20 frontends |
| Coolify | €0 | Open source |
| Supabase (1 proyecto free por cliente o 1 paid compartido) | $0–25 | Schemas separados en 1 DB |
| WhatsApp Cloud API (service messages) | $0 | Gratis si cliente escribe primero |
| LLM Gemini 2.5 Flash (free tier) | $0 | 250 req/día cubre 40+ negocios |
| Dominio + DNS (Cloudflare) | $0 | Free tier de Cloudflare |
| **Total** | **~€16–41/mes** | — |

**Comparado con Render:** 20 clientes × $7/servicio × 2 servicios = $280/mes → **ahorrás ~$240/mes**.

---

## Migración desde el código actual

### Fase 1 — Monorepo con Turborepo (sin cambiar funcionalidad)
1. Instalar Turborepo en la raíz
2. Mover components compartidos a `packages/ui/`
3. Mover types a `packages/types/`
4. Configurar `turbo.json` con pipelines de build
5. Verificar que todo buildea y los tests pasan

### Fase 2 — Parametrizar backend por TENANT
1. Agregar variable `TENANT` al backend
2. Cargar config específica según TENANT: `import(`tenants/${TENANT}/config`)`
3. Las rutas ya diferencian por negocio (`/api/zenco/`, `/api/mg_masajes/`)
4. Unificar en rutas genéricas: `/api/chat`, `/api/clients`, etc.

### Fase 3 — Dockerizar + Coolify
1. Escribir Dockerfile para backend y frontend
2. Setup Coolify en VPS Hetzner
3. Crear proyecto por cliente con env vars
4. Migrar desde Render progresivamente

### Fase 4 — Onboarding automatizado
1. Script que crea tenant config desde template
2. API de Coolify para crear proyecto automáticamente
3. Dashboard admin para gestionar clientes/tenants

---

## Documentación relacionada

- Costos de IA: `AI-COSTS-LLM-SELECTION.md`
- Infraestructura Docker: `INFRA-DOCKER-POR-CLIENTE.md`
- WhatsApp Cloud API: `WHATSAPP-CLOUD-API-SETUP.md`
- Precios y modelo SaaS: `WHATSAPP-PRICING-SAAS.md`
