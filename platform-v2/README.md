# Platform v2

Plataforma SaaS multi-tenant para pequeños negocios: talleres de ropa, centros de masajes, salones, clínicas y más.

Cada negocio (tenant) tiene su propia app web configurada con sus servicios, colores, módulos activos e integraciones. El backend, la base de datos y la infraestructura son compartidos — sin duplicar código.

---

## Índice

- [Visión general](#visión-general)
- [Tech stack](#tech-stack)
- [Arquitectura](#arquitectura)
- [Estructura de directorios](#estructura-de-directorios)
- [Quick start](#quick-start)
- [Configuración de entorno](#configuración-de-entorno)
- [Packages](#packages)
- [Tenants activos](#tenants-activos)
- [Cómo agregar un nuevo tenant](#cómo-agregar-un-nuevo-tenant)
- [Infraestructura](#infraestructura)
- [Testing](#testing)
- [Scripts útiles](#scripts-útiles)

---

## Visión general

**Platform v2** nació para resolver un problema concreto: dos clientes (Zenko y MG Masajes) compartían el mismo backend Express pero tenían código de frontend duplicado, rutas hardcodeadas por tenant y configuración dispersa en variables de entorno. El resultado era frágil, difícil de extender y costoso de mantener.

La nueva arquitectura centraliza todo en un monorepo Turborepo:

- Un **backend único** con rutas genéricas parametrizadas por `tenantId`.
- Un **frontend compartido** (`apps/web`) que se compila por tenant inyectando la config via `VITE_TENANT`.
- Paquetes internos reutilizables: tipos TypeScript, cliente API, UI components, validación y acceso a datos.
- Configuración de tenant declarativa en `tenants/<slug>/config.ts` — cambiar un precio, activar un módulo o ajustar el tema no requiere tocar código de la app.

### Tenants actuales

| Slug | Negocio | Dueño | Módulos activos |
|------|---------|-------|-----------------|
| `zenco` | Zenko — Arreglos de Indumentaria | Ana & Ariel | Prendas, QR, Fotos, Finanzas, WhatsApp, AI |
| `mg_masajes` | MG Masajes & Bienestar | Damian | Turnos, Fichas clínicas, Finanzas, WhatsApp, AI |

---

## Tech stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS v4, shadcn/ui, Radix UI |
| Backend | Node.js 20+, Express 5, TypeScript 5.7 |
| Base de datos | PostgreSQL 16 + Prisma 6 (con driver adapter `@prisma/adapter-pg`) |
| Validación | Zod v4 |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Monorepo | Turborepo 2 |
| Testing | Vitest 2, Supertest |
| Containerización | Docker + Docker Compose |
| Despliegue | Coolify en Hetzner VPS |
| AI | Claude (claude-3-5-haiku), herramientas por tenant |
| WhatsApp | Meta Business API (por tenant) |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                       Turborepo monorepo                    │
│                                                             │
│  ┌─────────────────┐         ┌─────────────────────────┐   │
│  │   apps/web       │         │     apps/backend         │   │
│  │  React 19 + Vite │         │  Express 5 + Prisma 6   │   │
│  │  Compilado por   │◄───────►│  Rutas genéricas        │   │
│  │  tenant (VITE_   │  HTTP   │  /api/:tenant/*         │   │
│  │  TENANT=zenco)   │         │                         │   │
│  └────────┬────────┘         └──────────┬──────────────┘   │
│           │                             │                   │
│  ┌────────▼────────┐         ┌──────────▼──────────────┐   │
│  │ packages/       │         │     packages/db          │   │
│  │  api-client     │         │  Prisma schema           │   │
│  │  config         │         │  Multi-tenant models     │   │
│  │  types          │         │  PostgreSQL 16            │   │
│  │  ui             │         └─────────────────────────┘   │
│  └─────────────────┘                                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  tenants/                            │   │
│  │  _template/  zenco/  mg_masajes/  (tu-tenant/)       │   │
│  │  config.ts   features.ts   prompts.ts   theme.ts     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de una request

```
Cliente (navegador)
    │
    │  GET /api/zenco/garments
    ▼
apps/backend → middleware de autenticación JWT
    │
    │  Verifica token → extrae { business: "zenco" }
    ▼
router.ts → resuelve config del tenant (slug → TenantConfig)
    │
    │  Inyecta tenantSlug en todos los queries Prisma
    ▼
routes/garments.ts → prisma.order.findMany({ where: { business: "zenco" } })
    │
    ▼
PostgreSQL → datos del tenant
```

### Compilación por tenant

```bash
VITE_TENANT=zenco npx turbo run build --filter=web
# → dist/  contiene la app de Zenko con su config, colores e i18n
```

---

## Estructura de directorios

```
platform-v2/
│
├── apps/
│   ├── backend/                  # Servidor Express 5
│   │   ├── src/
│   │   │   ├── index.ts          # Entry point, app setup
│   │   │   ├── router.ts         # Monta /api/:tenant/* con middleware
│   │   │   ├── middleware/       # auth, tenant-resolver, error-handler
│   │   │   ├── routes/           # garments, appointments, finances, clients...
│   │   │   ├── schemas.ts        # Schemas Zod compartidos
│   │   │   └── types.ts          # Tipos internos del backend
│   │   └── package.json
│   │
│   └── web/                      # Frontend React 19
│       ├── src/
│       │   ├── App.tsx           # Router raíz, lee VITE_TENANT
│       │   ├── main.tsx
│       │   ├── pages/            # Dashboard, Clientes, Turnos, Prendas...
│       │   ├── components/       # Componentes de feature
│       │   ├── layouts/          # MainLayout, AuthLayout
│       │   ├── hooks/            # useTenant, useAuth, useToast...
│       │   ├── services/         # Llamadas al api-client
│       │   ├── contexts/         # AuthContext, TenantContext
│       │   └── lib/              # Utilidades, formatters
│       └── package.json
│
├── packages/
│   ├── types/                    # Tipos TypeScript compartidos
│   │   └── src/index.ts          # Order, Appointment, Client, Finance...
│   │
│   ├── config/                   # Sistema de configuración de tenants
│   │   └── src/
│   │       ├── schema.ts         # Zod schema de TenantConfig
│   │       ├── defaults.ts       # Valores por defecto de features
│   │       └── index.ts          # parseTenantConfig(), getTenantConfig()
│   │
│   ├── api-client/               # Cliente HTTP tipado para el frontend
│   │   └── src/index.ts          # createApiClient(baseUrl, token)
│   │
│   ├── ui/                       # Componentes compartidos (shadcn/ui base)
│   │   └── src/
│   │       ├── Button.tsx
│   │       ├── Dialog.tsx
│   │       ├── Select.tsx
│   │       └── index.ts
│   │
│   └── db/                       # Prisma client + schema
│       ├── prisma/
│       │   └── schema.prisma     # Models multi-tenant
│       └── src/index.ts          # PrismaClient con pg adapter
│
├── tenants/
│   ├── _template/                # Punto de partida para nuevos tenants
│   │   ├── config.ts             # Identidad, servicios, features, tema, AI
│   │   └── features.ts           # Feature flags detallados
│   │
│   ├── zenco/                    # Zenko - Arreglos de Indumentaria
│   │   ├── config.ts
│   │   ├── features.ts
│   │   └── prompts.ts            # Prompts del asistente AI
│   │
│   └── mg_masajes/               # MG Masajes & Bienestar
│       ├── config.ts
│       ├── features.ts
│       ├── prompts.ts
│       └── theme.ts
│
├── infra/
│   ├── docker/
│   │   ├── Dockerfile.backend
│   │   ├── Dockerfile.web
│   │   └── nginx.conf
│   ├── coolify/
│   │   └── coolify-config.example.yml
│   ├── scripts/
│   │   ├── create-tenant.sh      # Bootstrap infra de nuevo tenant
│   │   ├── deploy-tenant.sh      # Deploy a Coolify
│   │   └── backup-db.sh          # Backup a S3
│   ├── docker-compose.yml        # Dev environment
│   ├── docker-compose.prod.yml   # Prod overrides
│   ├── docker-compose.tenant.yml # Template por tenant
│   └── COST-COMPARISON.md
│
├── package.json                  # Root workspace
├── turbo.json                    # Pipeline Turborepo
├── tsconfig.base.json            # TypeScript base config
└── README.md
```

---

## Quick start

### Prerrequisitos

- Node.js 20+ y npm 10+
- Docker Desktop (para la base de datos local)
- Variables de entorno configuradas (ver sección siguiente)

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/tu-org/Platform.git
cd Platform/platform-v2
npm install
```

Turborepo instala las dependencias de todos los workspaces (`apps/*`, `packages/*`, `tenants/*`) con un solo comando.

### 2. Levantar la base de datos

```bash
# Levanta PostgreSQL 16 en Docker
docker compose -f infra/docker-compose.yml up postgres -d

# Ejecutar migraciones
cd packages/db
npx prisma migrate deploy
cd ../..
```

### 3. Iniciar desarrollo

```bash
# Levanta backend + frontend en paralelo (hot-reload en ambos)
npx turbo dev
```

Por defecto el frontend carga el tenant `zenco`. Para cambiar de tenant:

```bash
VITE_TENANT=mg_masajes npx turbo dev --filter=web
```

| Servicio | URL |
|---------|-----|
| Backend API | http://localhost:3000 |
| Health check | http://localhost:3000/health |
| Frontend (Zenko) | http://localhost:5173 |

### 4. Build de producción

```bash
# Compila todos los packages y apps
npx turbo build

# Build para un tenant específico
VITE_TENANT=zenco npx turbo build --filter=web
```

---

## Configuración de entorno

Copiar el archivo de ejemplo y completar los valores:

```bash
cp infra/tenants/zenco/.env.template infra/tenants/zenco/.env
```

### Variables del backend

```env
# Servidor
NODE_ENV=development
PORT=3000

# Base de datos (Supabase pooler o PostgreSQL local)
DATABASE_URL=postgresql://platform:devpassword@localhost:5432/platform_dev

# JWT — generar con: openssl rand -base64 48
JWT_SECRET=

# Tenant a cargar (slug)
TENANT=zenco

# Integraciones opcionales
ZENCO_WA_PHONE_NUMBER_ID=
ZENCO_WA_BUSINESS_ACCOUNT_ID=
WHATSAPP_TOKEN=
GEMINI_API_KEY=
```

### Variables del frontend (Vite)

```env
VITE_TENANT=zenco
VITE_API_URL=http://localhost:3000
```

> Las variables que empiezan con `VITE_` se inyectan en el bundle del cliente en tiempo de build.
> Nunca colocar secrets en variables `VITE_`.

---

## Packages

### `@platform/types`

Tipos TypeScript compartidos entre backend y frontend. Sin dependencias externas.

```ts
import type { Order, Appointment, Client, Finance, TenantSlug } from '@platform/types'
```

Modelos principales: `Order`, `Appointment`, `Client`, `PatientRecord`, `Finance`, `ChatMessage`, `Notification`, `User`.

### `@platform/config`

Sistema de configuración de tenants. Valida el `config.ts` de cada tenant con Zod y expone helpers para leer la config en runtime.

```ts
import { parseTenantConfig, getTenantFeatures } from '@platform/config'

const config = parseTenantConfig(rawConfig)  // lanza si hay campos inválidos
const features = getTenantFeatures('zenco')  // lee desde tenants/zenco/features.ts
```

**`TenantConfigInput` — campos principales:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `slug` | `string` | Identificador único URL-safe (ej. `"zenco"`) |
| `name` | `string` | Nombre corto mostrado en la UI |
| `businessName` | `string` | Nombre completo para tickets/recibos |
| `currency` | `string` | Código ISO 4217 (default `"ARS"`) |
| `timezone` | `string` | IANA (default `"America/Buenos_Aires"`) |
| `owners` | `string[]` | Nombres de los operadores |
| `services` | `Service[]` | Listado de servicios con precio y duración |
| `features` | `FeatureFlags` | Módulos activos (garments, appointments, etc.) |
| `theme` | `ThemeConfig` | Colores y esquema de color |
| `ai` | `AIConfig?` | Modelo, prompt, herramientas (si aiChat activo) |
| `whatsapp` | `WhatsAppConfig?` | Phone number ID, templates (si whatsapp activo) |

**Feature flags disponibles:**

```ts
features: {
  garments: boolean          // Órdenes de ropa + QR tickets
  appointments: boolean      // Calendario de turnos
  patientRecords: boolean    // Fichas clínicas por paciente
  finances: boolean          // Registro de ingresos/gastos
  whatsapp: boolean          // Notificaciones WhatsApp Business
  aiChat: boolean            // Asistente AI con herramientas
  photoGallery: boolean      // Fotos por orden/prenda
  publicStatus: boolean      // Página pública de estado (QR scan)
  qrTickets: boolean         // Generación de tickets QR
}
```

### `@platform/api-client`

Cliente HTTP tipado que el frontend usa para comunicarse con el backend. Abstrae fetch con manejo de errores, tokens JWT y tipos de respuesta.

```ts
import { createApiClient } from '@platform/api-client'

const api = createApiClient('http://localhost:3000', token)

const orders = await api.garments.list('zenco')
const appt   = await api.appointments.create('mg_masajes', { ... })
```

### `@platform/ui`

Componentes React compartidos basados en shadcn/ui + Radix UI. Peer dep con React 19 y Tailwind v4.

```ts
import { Button, Dialog, Select } from '@platform/ui'
```

Los estilos de tema (colores primarios, acentos) se inyectan via CSS variables desde la config del tenant, no hardcodeados en los componentes.

### `@platform/db`

Cliente Prisma 6 configurado con el adapter `@prisma/adapter-pg` para compatibilidad con Supabase connection pooling.

```ts
import { prisma } from '@platform/db'

const orders = await prisma.order.findMany({
  where: { business: tenantSlug },
  orderBy: { createdAt: 'desc' },
})
```

**Modelos en `schema.prisma`:**

| Modelo | Tenant | Descripción |
|--------|--------|-------------|
| `Tenant` | N/A | Registro de tenants activos |
| `User` | `business` field | Usuarios con autenticación JWT |
| `Client` | `business` field | Clientes del negocio |
| `Order` | (scope futuro) | Órdenes de ropa — Zenko |
| `GarmentPhoto` | via Order | Fotos de prendas |
| `ZencoFinance` | implicit | Finanzas Zenko |
| `MgMasajesFinance` | implicit | Finanzas MG Masajes |
| `Appointment` | (scope futuro) | Turnos — MG Masajes |
| `PatientRecord` | via Client | Fichas clínicas |
| `Notification` | via Client | Historial de notificaciones |
| `ChatMessage` | `business` field | Historial del chat AI |

> Nota: `Order`, `Appointment`, `ZencoFinance` y `MgMasajesFinance` aún no tienen `tenantId` explícito — la normalización completa es parte del plan de migración. Ver `MIGRATION-GUIDE.md`.

---

## Tenants activos

### Zenko — Arreglos de Indumentaria

- **Slug:** `zenco`
- **Dueños:** Ana & Ariel
- **Dirección:** Independencia 243, Morón, Buenos Aires
- **Módulos activos:** Prendas (CRUD + QR + fotos), Finanzas, WhatsApp (notificación "lista para retirar"), AI chat, Página pública de estado
- **Servicios:** Basta ($3.000), Cierre ($4.000), Parche ($2.500), Achicado/Agrandado ($5.000), Botones ($1.500), Entalle Cintura ($4.500), Forro ($6.000), Otro (a convenir)
- **Tema:** Violeta (`#7c3aed`) + ámbar (`#f59e0b`)

### MG Masajes & Bienestar

- **Slug:** `mg_masajes`
- **Dueño:** Damian
- **Módulos activos:** Turnos (con detección de conflictos), Fichas clínicas, Finanzas, WhatsApp (confirmación y recordatorio), AI chat + agente de reservas
- **Servicios:** Masaje Relajante ($8.000/60min), Descontracturante ($10.000/60min), Deportivo ($10.000/45min), Drenaje Linfático ($12.000/75min), Craneosacral ($9.000/50min), Combo Relax ($15.000/90min), Reflexología ($7.000/45min), Prenatal ($9.000/60min)
- **Tema:** Teal (`#0d9488`) + ámbar (`#f59e0b`)

---

## Cómo agregar un nuevo tenant

### Paso 1 — Crear la configuración

```bash
cp -r tenants/_template tenants/mi_negocio
```

Editar `tenants/mi_negocio/config.ts`:

```ts
const config: TenantConfigInput = {
  slug: 'mi_negocio',
  name: 'Mi Negocio',
  businessName: 'Mi Negocio SAS',
  owners: ['Nombre del dueño'],
  contactPhone: '1100000000',
  services: [
    { id: 'servicio_1', name: 'Servicio principal', defaultPrice: 5000, duration: 60 }
  ],
  features: {
    appointments: true,   // activar solo lo que se usa
    finances: true,
    // resto en false
  },
  theme: {
    primaryColor: '#10b981',  // verde esmeralda
    accentColor: '#f59e0b',
    colorScheme: 'light',
  },
}
```

### Paso 2 — Validar la config

```bash
npx tsx infra/scripts/validate-tenant.ts mi_negocio
```

### Paso 3 — Registrar en la base de datos

```bash
# Insertar el tenant en la tabla `tenants`
npx tsx infra/scripts/seed-tenant.ts mi_negocio
```

### Paso 4 — Generar infraestructura

```bash
./infra/scripts/create-tenant.sh mi_negocio --domain mi-negocio.com
```

Esto genera:
- `infra/tenants/mi_negocio/docker-compose.yml` (compose override)
- `infra/tenants/mi_negocio/.env.template` (variables de entorno)
- Registra el tenant en `infra/tenants/index.json`

### Paso 5 — Completar variables de entorno

```bash
cp infra/tenants/mi_negocio/.env.template infra/tenants/mi_negocio/.env
# Completar DATABASE_URL, JWT_SECRET, e integraciones opcionales
```

### Paso 6 — Deploy

```bash
./infra/scripts/deploy-tenant.sh mi_negocio prod
```

Luego en Coolify:
1. Crear nuevo servicio → Docker Compose
2. Apuntar a `infra/tenants/mi_negocio/docker-compose.yml`
3. Cargar las variables de entorno desde el `.env`
4. Deploy — Coolify configura Traefik + SSL automáticamente

---

## Infraestructura

### Arquitectura de despliegue

```
Internet
    │
    ▼
Hetzner VPS (Ubuntu 24.04)
    │
    ├── Coolify (panel de despliegue)
    │       │
    │       ├── Traefik (reverse proxy + SSL automático Let's Encrypt)
    │       │
    │       ├── platform-backend  (contenedor Express)
    │       │       └── :3000
    │       │
    │       ├── platform-web-zenco  (Nginx sirviendo Vite build)
    │       │       └── zenco.tudominio.com → :80
    │       │
    │       └── platform-web-mg-masajes
    │               └── mgmasajes.tudominio.com → :80
    │
    └── PostgreSQL 16 (Supabase cloud o contenedor local)
```

### Docker Compose

| Archivo | Uso |
|---------|-----|
| `infra/docker-compose.yml` | Desarrollo local completo (postgres + backend + web) |
| `infra/docker-compose.prod.yml` | Overrides de producción (sin volúmenes de código) |
| `infra/docker-compose.tenant.yml` | Template para generar compose por tenant |
| `infra/tenants/<slug>/docker-compose.yml` | Compose específico del tenant (auto-generado) |

### Coolify

Coolify maneja el ciclo completo de despliegue:

- Pull del repo en cada push a `main` (webhook GitHub)
- Build de imágenes Docker en el servidor
- Rolling restart sin downtime
- Provisioning automático de certificados SSL (Let's Encrypt via Traefik)
- Variables de entorno encriptadas por servicio

Ver `infra/coolify/coolify-config.example.yml` para referencia de configuración.

### Base de datos

Se recomienda Supabase como proveedor PostgreSQL gestionado:

- Usar el **Pooler URL** (puerto 6543) con `?pgbouncer=true&connection_limit=1`
- El adapter `@prisma/adapter-pg` es obligatorio para compatibilidad con pgBouncer
- Backups automáticos: `infra/scripts/backup-db.sh` (cron diario a S3)

### Costos estimados

Ver `infra/COST-COMPARISON.md` para la comparación Render (viejo) vs Coolify/Hetzner (nuevo).

---

## Testing

```bash
# Correr todos los tests
npx turbo test

# Solo backend
npx turbo test --filter=backend

# Watch mode
cd apps/backend && npx vitest

# Coverage
cd apps/backend && npx vitest run --coverage
```

Los tests del backend usan Vitest + Supertest. Los mocks de Prisma están en `apps/backend/src/__tests__/setup.ts`.

**Regla TDD obligatoria:** tests antes de implementación. Para cualquier cambio en routes o components, el orden es: test en rojo → implementación → test en verde → suite completa.

---

## Scripts útiles

```bash
# Verificar TypeScript en todos los packages
npx turbo typecheck

# Limpiar builds
npx turbo clean

# Crear nuevo tenant (genera infra y env template)
./infra/scripts/create-tenant.sh <slug> --domain <dominio>

# Deploy de un tenant a producción
./infra/scripts/deploy-tenant.sh <slug> prod

# Backup de base de datos
./infra/scripts/backup-db.sh <slug>

# Generar cliente Prisma (después de cambiar schema.prisma)
cd packages/db && npx prisma generate

# Crear migración de base de datos
cd packages/db && npx prisma migrate dev --name descripcion-del-cambio

# Aplicar migraciones en producción
cd packages/db && npx prisma migrate deploy
```

---

## Decisiones de diseño

- **Un backend, múltiples tenants:** las rutas son `/api/:tenant/*` y cada handler recibe el slug del tenant del JWT. No hay instancias separadas del servidor por tenant.
- **Config declarativa en TypeScript:** el `config.ts` de cada tenant es código TypeScript real, no YAML ni JSON. Esto permite autocompletado, validación en tiempo de compilación y lógica condicional simple.
- **Feature flags conservadores:** todos los módulos están desactivados por defecto. Un tenant activa solo lo que usa — no hay código muerto ejecutándose.
- **Compilación por tenant en el frontend:** `VITE_TENANT=zenco vite build` produce un bundle optimizado que solo incluye las rutas y componentes del tenant activo (tree-shaking basado en config).
- **Un schema Prisma compartido:** todos los tenants usan la misma base de datos. El scope por tenant se maneja con el campo `business` en cada modelo.
