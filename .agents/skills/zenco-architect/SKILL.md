---
name: zenco-architect
description: "Arquitecto del ecosistema Zenco. TRIGGER cuando el usuario mencione: 'dashboard de zenco', 'bot de whatsapp', 'prendas', 'ordenes', 'Ana', 'Ariel', 'taller de ropa', 'arreglos indumentaria', 'agregar feature al bot', 'conectar DB', 'deploy zenco', 'API de zenco'. Contiene: mapa completo de la arquitectura, stack tecnológico, rutas de archivos, esquema de DB y decisiones de diseño.
DO NOT TRIGGER cuando: el usuario trabaja en proyectos de automatización de QA, OneVisa, o cualquier negocio que no sea Zenco."
roles: [developer]
---

# 🦊 Zenco Architect

Sos el experto en la arquitectura completa del ecosistema **Zenco**: el sistema de gestión para el taller de arreglos de ropa e indumentaria de Ana y Ariel.

Antes de editar cualquier archivo del proyecto, leé este skill completo.

---

## 🗺️ Estructura del Proyecto

```
c:\Users\admin\Documents\Github\Zenko\
├── src/                          → React + Vite Frontend (Dashboard)
│   ├── pages/
│   │   ├── Dashboard.tsx         → Vista principal con métricas y modal de nueva orden
│   │   ├── Garments.tsx          → Gestión de prendas con filtro de búsqueda
│   │   └── Finances.tsx          → Control financiero (ingresos/gastos)
│   ├── services/
│   │   └── api.ts                → Cliente HTTP hacia el Backend (fetch + TS types)
│   ├── assets/
│   │   └── logo.png              → Logo del Zorro Kitsune generado por IA
│   ├── mocks/
│   │   └── data.ts               → Datos de fallback (sólo para tests unitarios)
│   ├── App.tsx                   → Router principal de tabs (sidebar navigation)
│   └── index.css                 → Design system completo (CSS variables ámbar/beige)
│
├── server-bot/                   → Node.js Backend (API + Bot WhatsApp)
│   ├── src/
│   │   ├── index.ts              → Express REST API (GET/POST /api/garments, /api/finances)
│   │   ├── bot.ts                → Bot WhatsApp (Baileys + Gemini Function Calling)
│   │   └── seed.ts               → Sembrador inicial de la base de datos
│   ├── prisma/
│   │   └── schema.prisma         → Schema DB: Order + FinancialEntry
│   ├── .env                      → Variables secretas LOCALES (no en Git)
│   └── .env.example              → Template de variables requeridas
│
├── damian-frontend/              → (FASE 5) Copia mutada para Masajes Damián
├── damian-bot/                   → (FASE 5) Backend mutado para Masajes Damián
│
├── docker-compose.yml            → Orquestador Docker (zenco-frontend + zenco-backend)
├── Dockerfile.frontend           → Build de Nginx para el Frontend
├── server-bot/Dockerfile.bot     → Build Node para el Bot
├── README.md                     → Documentación oficial del proyecto
├── ROADMAP.md                    → Hoja de ruta completa a largo plazo
└── .agents/                      → Skills de Antigravity para este proyecto (este directorio)
```

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Versión | Notas |
|------|-----------|---------|-------|
| Frontend | React + Vite | 18 / 8.x | TypeScript estricto (`verbatimModuleSyntax`) |
| Estilos | Vanilla CSS | — | Variables CSS con paleta Zenko (ámbar #D66D26, crema #F6F1EA) |
| Backend API | Node.js + Express | 20 / 4.x | REST en puerto 3000 |
| ORM | Prisma | 6.x | SQLite local → PostgreSQL en prod |
| DB Local | SQLite | — | Archivo: `server-bot/prisma/zenco-dev.db` |
| DB Prod | PostgreSQL | — | Supabase / Neon (Free tier) |
| Bot WhatsApp | Baileys | 6.x | Sin API de Meta. Escaneo QR. |
| IA | Gemini 1.5 Flash | — | Function Calling habilitado para DB queries |
| Tests E2E | Playwright | — | Smoke tests en `tests/app.spec.ts` |
| Tests Unitarios | Vitest | — | En `src/pages/*.test.tsx` |
| Containerización | Docker + Compose | — | Multi-stage build |

---

## 🗄️ Esquema de Base de Datos

```prisma
model Order {
  id           String   @id       // Ej: "ORD-001"
  clientName   String             // Nombre del cliente
  clientPhone  String             // Teléfono (también usado por el bot para buscar)
  garmentName  String             // Ej: "Campera de Cuero"
  repairType   String             // "dobladillo" | "cierre" | "entalle" | "diseño"
  description  String             // Detalle del trabajo a realizar
  status       String @default("recibido")  // "recibido"|"en_proceso"|"listo"|"entregado"
  deliveryDate String             // Fecha prometida de entrega (YYYY-MM-DD)
  price        Float              // Costo en ARS
  createdAt    DateTime @default(now())
}

model FinancialEntry {
  id          String   @id
  date        String             // YYYY-MM-DD
  type        String             // "income" | "expense"
  category    String             // Ej: "Arreglos", "Insumos"
  amount      Float
  description String
}
```

---

## 🔌 API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/garments` | Lista todas las prendas ordenadas por fecha de entrega |
| POST | `/api/garments` | Crea una nueva orden de arreglo |
| PUT | `/api/garments/:id/status` | Actualiza el estado de una prenda |
| GET | `/api/finances` | Lista todos los movimientos financieros |

---

## 🤖 Bot AI (Function Calling)

El bot usa **Gemini 1.5 Flash** con una herramienta declarada:

```js
{
  name: "check_garment_status",
  description: "Busca en la DB el estado de la prenda de un cliente",
  parameters: {
    clientQuery: STRING  // Nombre o teléfono del cliente
  }
}
```

**Flujo completo:**
1. Cliente envía WhatsApp a Zenco
2. Gemini detecta intención de consulta de estado
3. Llama automáticamente a `check_garment_status("nombre_cliente")`
4. El bot ejecuta `prisma.order.findFirst({ where: { clientName: { contains: query } } })`
5. Gemini recibe el resultado y redacta una respuesta amigable en español

---

## 🌐 Plan de Deploy (Fase 4)

| Servicio | Plataforma | Tier | Variables Requeridas |
|---------|----------|------|---------------------|
| Frontend (React) | Vercel | Free always | `VITE_API_URL` |
| Backend + Bot | Koyeb | Nano Free | `GEMINI_API_KEY`, `DATABASE_URL` |
| Base de Datos | Supabase / Neon | Free 500MB | Auto (connection string) |

> **BLOCKER PENDIENTE:** El repositorio existe localmente con 4+ commits pero NO ha sido subido a GitHub aún. Se necesita:
> 1. Crear repo en `github.com` llamado `Zenko`
> 2. Ejecutar: `git remote add origin https://github.com/[usuario]/Zenko.git && git push -u origin master`

---

## 🎨 Design System (CSS Variables)

```css
--primary-color: #D66D26;    /* Naranja zorro — acentos principales */
--bg-primary: #F6F1EA;       /* Crema — fondo general */
--bg-sidebar: #2C1A0E;       /* Marrón oscuro — barra lateral */
--text-primary: #2C1A0E;     /* Texto principal */
--text-secondary: #8C6E54;   /* Texto secundario */
--urgent-color: #E84A2D;     /* Rojo — alertas urgentes */
--success-color: #4CAF50;    /* Verde — estado completado */
```

---

## 🚧 Estado de Fases

| Fase | Descripción | Estado |
|------|------------|--------|
| 1 | UI/UX Premium (Dashboard, Prendas, Finanzas) | ✅ Completa |
| 2 | Bot WhatsApp + Gemini AI | ✅ Completa (pendiente QR scan) |
| 3 | API Express + DB Prisma/SQLite | ✅ Completa local |
| 4 | Deploy GitHub + Vercel + Koyeb + Supabase | 🔴 Pendiente (faltan credenciales cloud) |
| 5 | Multi-negocio Damián (Masajes) | 🟡 Iniciada (carpetas creadas, sin customizar) |
