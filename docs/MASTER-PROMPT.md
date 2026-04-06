# Master Prompt — Platform (Zenko + Damian)

> Copiar y pegar este prompt al inicio de cada nueva sesion de trabajo.
> Ultima actualizacion: 2026-04-06 (post sesion 12)

---

## Contexto del proyecto

Monorepo con 3 proyectos:
- `backend/` — Express + Prisma + Supabase PostgreSQL (port 6543 pooler, 5432 direct)
- `clients/zenko/` — React + Vite (Ana & Ariel, taller de arreglos de ropa)
- `clients/damian/` — React + Vite (Damian, masajista/turnos/fichas clinicas)

Deploy: Render (backend: `platform-backend`, frontends: static sites)
Tests: Vitest (301 tests: 216 backend + 48 zenko + 37 damian)
CI: GitHub Actions (solo backend por ahora)
PWA: Ambas apps instalables, offline-first con IndexedDB cache + mutation queue

## Infraestructura Render

| Servicio | ID | URL | Tipo |
|----------|-----|-----|------|
| platform-backend | srv-d78t7c94tr6s73cggik0 | platform-backend-8upb.onrender.com | Web Service |
| zenko-app | srv-d78t8ema2pns73dppgl0 | platform-ypkr.onrender.com | Static Site |
| damian-app | srv-d78t9c450q8c73f6g1k0 | damian-app.onrender.com | Static Site |

Script de visibilidad: `bash scripts/render-status.sh [status|deploys|logs|env]`

### Variables de entorno (.env)

**backend/.env:**
- `DATABASE_URL` — Supabase pooler (port 6543)
- `DIRECT_DATABASE_URL` — Supabase directa (port 5432, para migraciones)
- `GEMINI_API_KEY` — Google AI (agotada)
- `RENDER_API_TOKEN` — API token para scripts de visibilidad
- `JWT_SECRET` — (PENDIENTE: agregar en Render y local)
- `NODE_ENV`, `PORT`

**clients/zenko/.env:**
- `VITE_API_URL=http://localhost:3000/api/zenco` (BUG: apunta a localhost, no a Render)

**clients/damian/.env:**
- `VITE_API_URL=http://localhost:3000/api/damian` (BUG: apunta a localhost, no a Render)

## Estado actual (post sesion 12)

### Completado recientemente
- M11 (backend): JWT auth — User model, register/login, authenticate middleware, requireBusiness, 18 tests (216 backend total)
- Render visibility: `scripts/render-status.sh` — status, deploys, logs, env
- Infraestructura y .env mapeados en master prompt

### Bugs conocidos activos
- **M11 INCOMPLETO** — backend protegido pero frontend no tiene login UI. Deploy actual rompe
- **JWT_SECRET** falta en Render env vars — backend crashea en prod sin esto
- **Tabla users** no existe en Supabase — falta correr migración
- Gemini API key agotada (chat demo y Agent no funcionan)
- Frontend .env apunta a localhost:3000 (no funciona desde Render deploy)
- N+1 queries en /dashboard/stale-patients y /patients (critico para performance)
- IDs con Date.now() en Order/Appointment/Finance (colision posible)
- Cero loading state en botones submit (doble-click crea duplicados)
- No hay Escape key ni focus trap en ningun modal
- Zenko no tiene config.ts (greeting, repairTypes, currency hardcodeados)
- CI no corre tests frontend
- Últimos deploys fallaron en build (commit ci.yml)

## Prioridades ordenadas para sesion 13

### Criticas (M11 completion — sin esto deploy rompe)
1. **M11-a** — Migración DB: `prisma db push` para crear tabla users en Supabase
2. **M11-b** — Agregar JWT_SECRET a Render env vars (backend service)
3. **M11-c** — Login UI en ambos clientes (formulario + token storage en localStorage)
4. **M11-d** — Actualizar api.ts: enviar Bearer token en todos los requests
5. **M11-e** — Auto-redirect a login en 401
6. **M11-f** — Seed script para usuarios iniciales (Ana, Damian, Jorge)
7. **M11-g** — CORS restrictivo (solo Render URLs + localhost)

### Criticas (performance)
8. **M20** — Fix N+1 queries en stale-patients y patients (docs/roadmap/M20-fix-n-plus-1.md)

### Altas (calidad y estabilidad)
9. **M17** — Loading state en botones submit (docs/roadmap/M17-loading-states.md)
10. **M22** — UUID en todos los modelos (docs/roadmap/M22-uuid-migration.md)
11. **D27** — Tests faltantes en Damian: 10 componentes sin tests (docs/roadmap/D27-tests-faltantes.md)
12. **M12** — CI frontend: agregar tests de ambos clientes al GitHub Action
13. **Z17** — config.ts para Zenko (docs/roadmap/Z17-config-ts.md)
14. **M25** — Renovar Gemini API key (docs/roadmap/M25-gemini-key.md)
15. **D22** — DELETE /appointments/:id + boton eliminar (docs/roadmap/D22-delete-appointments.md)
16. **M16** — Shared packages workspace (docs/roadmap/M16-shared-packages.md)

### Medias (UX y features)
17. **M14** — Escape key + focus trap en modales
18. **M21** — Status enum validation (docs/roadmap/M21-status-enum.md)
19. **M10** — React Router (URLs reales, back/forward, deep linking)
20. **D23** — Editar fichas clinicas desde Patients.tsx
21. **D24** — Filtro "Proximas" vs "Historial" en Appointments
16. **Z9** — WhatsApp quick-send boton "Avisar"
17. **Z10** — Workflow "Entregar" auto-crear ingreso financiero
18. **Z14** — Filtro por status en tabla Garments
19. **Z15** — Highlight filas vencidas en Garments
20. **Z18** — Mostrar deliveryDate e intakeDate en tabla Garments
21. **M19** — Confirm modal custom (reemplazar window.confirm)
22. **M23** — Cache TTL en cachedFetch
23. **Z19** — Revenue widget en Zenko Dashboard
24. **D25** — Revenue widget en Damian Dashboard
25. **Z20 + D26** — DELETE /clients/:id + boton eliminar
26. **M13** — Object storage para fotos (S3/R2)
27. **M15** — Paginacion en endpoints y tablas

### Bajas
28. **M18** — Eliminar console.error leftovers
29. **M24** — Extraer helpers compartidos backend (getMonthRange, etc)
30. **D11** — Vista impresion fichas
31. **Z12** — Export CSV/PDF mensual

## Reglas de trabajo

1. **TDD obligatorio** — tests ANTES de implementacion. Todo CRUD con unit + integration tests.
2. **Push directo a main** — sin ramas ni PRs.
3. **Sub-agentes siempre** — NUNCA leer archivos directo, delegar a sub-agentes para preservar contexto.
4. **Responsive** — modales con `min(Xpx, 90vw)`. No inline width hardcodeado.
5. **CSS variables** — usar `var(--color)` del design system. No hardcodear colores.
6. **Toast, no alert** — usar `toast.error()` / `toast.success()` del ToastContext.
7. **Commit frecuente** — commit despues de cada fase completada, no al final.
8. **Audit post-sesion** — siempre hacer audit antes del push final. Agregar findings al ROADMAP.

## Archivos clave

| Archivo | Que es |
|---------|--------|
| `ROADMAP.md` | Fuente de verdad del roadmap (items pendientes/completados) |
| `docs/roadmap/*.md` | Documentacion detallada de cada item |
| `backend/src/schemas.ts` | Zod schemas para validacion |
| `backend/src/routes/zenco.ts` | Rutas Zenko |
| `backend/src/routes/damian.ts` | Rutas Damian |
| `backend/src/__tests__/setup.ts` | Mocks de Prisma para tests |
| `clients/*/src/services/api.ts` | Funciones API (con cachedFetch/mutationFetch) |
| `clients/*/src/services/db.ts` | IndexedDB cache layer |
| `clients/*/src/services/sync.ts` | Offline mutation sync |
| `clients/*/src/components/ToastContext.tsx` | Toast notifications |
| `clients/damian/src/config.ts` | Config de negocio Damian |
| `backend/prisma/schema.prisma` | Schema de la DB |
| `backend/.env` | Variables de entorno backend (DB, API keys, tokens) |
| `clients/zenko/.env` | API URL para Zenko frontend |
| `clients/damian/.env` | API URL para Damian frontend |
| `scripts/render-status.sh` | Visibilidad Render (status, deploys, logs, env) |

## Como empezar

```
continua con el master prompt
```

El agente va a:
1. Leer la memoria persistente y el ROADMAP
2. Verificar el estado actual (git status, test count)
3. Proponer plan para la sesion basado en las prioridades
4. Esperar aprobacion antes de ejecutar
