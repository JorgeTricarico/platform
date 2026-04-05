---
name: zenco-architect
description: "Arquitecto del ecosistema Zenco/Platform. TRIGGER cuando el usuario mencione: 'dashboard de zenco', 'bot de whatsapp', 'prendas', 'ordenes', 'Ana', 'Ariel', 'taller de ropa', 'arreglos indumentaria', 'Damian', 'masajes', 'turnos', 'fichas clinicas', 'agregar feature', 'conectar DB', 'deploy', 'API'. Contiene: mapa completo de la arquitectura monorepo, stack tecnologico, rutas, esquema de DB y decisiones de diseño.
DO NOT TRIGGER cuando: el usuario trabaja en proyectos no relacionados a Zenco/Damian."
roles: [developer]
---

# Zenco Platform Architect

Experto en la arquitectura del **Platform monorepo**: sistema de gestion para dos negocios (Zenko arreglos de ropa + Damian masajes).

Antes de editar cualquier archivo del proyecto, lee este skill completo.

---

## Estructura del Monorepo

```
Platform/
├── backend/                      → Express + Prisma + Supabase (unificado)
│   ├── src/
│   │   ├── index.ts              → Entry point, registra todas las rutas
│   │   ├── db.ts                 → Prisma client con pg adapter
│   │   ├── seed.ts               → Seed de datos iniciales
│   │   └── routes/
│   │       ├── zenco.ts          → CRUD garments + finances + clients (Zenko)
│   │       ├── damian.ts         → CRUD appointments + finances + clients + patients (Damian)
│   │       ├── chat-zenco.ts     → Chatbot publico Zenko (Gemini, sin function calling)
│   │       ├── chat-damian.ts    → Chatbot publico Damian (Gemini + function calling)
│   │       └── agent-damian.ts   → Agente IA privado de Damian (fichas, pacientes, turnos)
│   ├── prisma/
│   │   └── schema.prisma         → Modelos: Order, ZencoFinance, Appointment, DamianFinance, Client, PatientRecord
│   └── package.json
│
├── clients/
│   ├── zenko/                    → React + Vite (arreglos de ropa, Ana & Ariel)
│   │   └── src/pages/            → Dashboard, Garments, Finances, Clients, ChatDemo
│   └── damian/                   → React + Vite (masajes, Damian)
│       └── src/pages/            → Dashboard, Appointments, Finances, Clients, Patients, Agent, ChatDemo, Ambient
│
└── render.yaml                   → Deploy config para Render
```

---

## Stack Tecnologico

| Capa | Tecnologia | Notas |
|------|-----------|-------|
| Frontend | React 18 + Vite + TypeScript | Dos apps independientes |
| Backend API | Express + TypeScript (ESM) | Puerto 3000, CORS habilitado |
| ORM | Prisma 7.x con @prisma/adapter-pg | Pool directo a PostgreSQL |
| DB Prod | Supabase PostgreSQL | Pooler (6543) para queries, Direct (5432) para DDL |
| IA | Gemini `gemini-3.1-flash-lite-preview` | 2.0 tiene quota agotada |
| Deploy | Render | Backend: web service, Frontends: static sites |

---

## Esquema de DB (Prisma)

```prisma
model Client {
  id        String   @id @default(uuid())
  name      String
  phone     String
  altPhone  String?
  email     String?
  business  String               // "zenco" o "damian"
  notes     String?
  createdAt DateTime @default(now())
  @@unique([phone, business])
  @@map("clients")
}

model Order {
  id           String   @id      // "ORD-{timestamp}-{rand}"
  clientName   String
  clientPhone  String
  garmentName  String
  repairType   String            // "dobladillo"|"cierre"|"entalle"|"diseño"
  description  String
  status       String   @default("recibido")  // recibido|en_proceso|listo|entregado
  intakeDate   String   @default("")          // Fecha de ingreso YYYY-MM-DD
  deliveryDate String            // Fecha de entrega YYYY-MM-DD
  price        Float
  createdAt    DateTime @default(now())
}

model Appointment {
  id          String   @id      // "APT-{timestamp}-{rand}"
  clientName  String
  clientPhone String
  service     String
  duration    Int
  date        String
  time        String
  status      String   @default("pendiente")
  price       Float
  notes       String?
  createdAt   DateTime @default(now())
}

model PatientRecord {
  id           String   @id @default(uuid())
  clientId     String
  date         String
  reason       String
  symptoms     String?
  areas        String?
  treatment    String?
  observations String?
  nextSession  String?
  createdAt    DateTime @default(now())
  @@index([clientId])
  @@map("patient_records")
}

// ZencoFinance, DamianFinance: id, date, type, category, amount, description
```

---

## API Endpoints

### Zenko (`/api/zenco`)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/garments` | Lista prendas |
| POST | `/garments` | Crear orden (**price debe ser Number, todos los campos required**) |
| PUT | `/garments/:id` | Editar orden completa |
| PUT | `/garments/:id/status` | Cambiar status |
| DELETE | `/garments/:id` | Eliminar orden |
| GET/POST | `/finances` | CRUD finanzas |
| GET/POST | `/clients` | CRUD clientes (upsert por phone+business) |
| GET | `/clients/search?q=` | Buscar clientes |
| POST | `/chat` | Chatbot publico |

### Damian (`/api/damian`)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET/POST | `/appointments` | CRUD citas |
| PUT | `/appointments/:id/status` | Cambiar status |
| GET/POST | `/finances` | CRUD finanzas |
| GET/POST | `/clients` | CRUD clientes |
| GET | `/clients/search?q=` | Buscar clientes |
| GET | `/patients` | Lista pacientes con info de fichas |
| GET | `/patients/:clientId/records` | Fichas clinicas de un paciente |
| POST | `/patients/:clientId/records` | Crear ficha clinica |
| PUT | `/patients/records/:id` | Editar ficha clinica |
| POST | `/chat` | Chatbot publico (function calling) |
| POST | `/agent` | Agente IA privado de Damian |

---

## IMPORTANTE: Migraciones DB

**Supabase usa PgBouncer en puerto 6543 (pooler).** Los DDL statements (CREATE TABLE, ALTER TABLE) NO funcionan por el pooler. Para migraciones:

```bash
# Usar la URL DIRECTA (puerto 5432) de Supabase:
DATABASE_URL="postgresql://postgres.xxx:password@aws-0-xx.pooler.supabase.com:5432/postgres" npx prisma db push
```

Encontrar la URL directa en: Supabase Dashboard > Settings > Database > Connection string > Direct.

**`prisma db push` cuelga si usas puerto 6543.** Esto bloquea la creacion de nuevas tablas/columnas.

---

## IMPORTANTE: Testing

**Todo endpoint CRUD debe tener tests unitarios y de integracion.**

- Tests de Zenko existen en: `clients/zenko/src/pages/Dashboard.test.tsx` (11/11 pasaron)
- Tests de backend: deben cubrir todos los endpoints (garments, appointments, finances, clients, patients)
- Tests deben verificar: happy path, campos requeridos, price como Number, respuestas de error

Antes de considerar un endpoint "terminado", debe tener al menos:
1. Test unitario del handler (mock Prisma)
2. Test de integracion que haga request HTTP real al endpoint

---

## Chatbots

- **Zenco**: Gemini simple (no function calling), inyecta pedidos recientes como contexto
- **Damian publico**: Gemini con function calling (`book_appointment`, `check_appointments`, `lookup_client`)
- **Damian agente privado**: Gemini con 5 functions (`search_patients`, `get_patient_history`, `save_patient_record`, `register_patient`, `get_today_appointments`)
- Ambos chatbots: si reciben `senderPhone`, buscan cliente y auto-registran si es nuevo
- Modelo Gemini: `gemini-3.1-flash-lite-preview` (quota de 2.0 agotada)

---

## Design System

### Zenko (ambar/beige)
```css
--primary-color: #D66D26;
--bg-primary: #F6F1EA;
--bg-sidebar: #2C1A0E;
```

### Damian (usa config.ts para branding)
Importa `BUSINESS` de `config.ts` para nombre, logo, y labels.

---

## Git Workflow

Push directo a `main`, sin branches ni PRs. El usuario trabaja solo.
