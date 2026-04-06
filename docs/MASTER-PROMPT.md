# Master Prompt — Platform (Zenko + Damian)

> Copiar y pegar este prompt al inicio de cada nueva sesion de trabajo.
> Ultima actualizacion: 2026-04-06 (post sesion 14)

---

## Contexto del proyecto

Monorepo con 3 proyectos:
- `backend/` — Express 5 + Prisma 7 (adapter-pg) + Supabase PostgreSQL (port 6543 pooler, 5432 session mode)
- `clients/zenko/` — React 19 + Vite 7 (Ana & Ariel, taller de arreglos de ropa)
- `clients/damian/` — React 19 + Vite 7 (Damian, masajista/turnos/fichas clinicas)

Deploy: Render (backend: `platform-backend`, frontends: static sites)
Tests: Vitest (301 tests: 216 backend + 48 zenko + 37 damian)
CI: GitHub Actions (solo backend por ahora)
PWA: Ambas apps instalables, offline-first con IndexedDB cache + mutation queue

## Infraestructura Render

| Servicio | ID | URL | Tipo |
|----------|-----|-----|------|
| platform-backend | srv-d78t7c94tr6s73cggik0 | platform-backend-8upb.onrender.com | Web Service |
| zenko-app | srv-d79sjinkijhs73937rc0 | zenko-app.onrender.com | Static Site |
| damian-app | srv-d78t9c450q8c73f6g1k0 | damian-app.onrender.com | Static Site |

Script de visibilidad: `bash scripts/render-status.sh [status|deploys|logs|env]`

### Variables de entorno (.env)

**backend/.env:**
- `DATABASE_URL` — Supabase pooler (port 6543)
- `DIRECT_DATABASE_URL` — Supabase directa (port 5432, para migraciones)
- `GEMINI_API_KEY` — Google AI (agotada)
- `RENDER_API_TOKEN` — API token para scripts de visibilidad
- `JWT_SECRET` — Configurado en local y Render
- `REQUIRE_AUTH` — `true` en Render (produccion), `false` para demo mode local
- `NODE_ENV`, `PORT`

**clients/zenko/.env (local):**
- `VITE_API_URL=http://localhost:3000/api/zenco`
- En Render: `VITE_API_URL=https://platform-backend-8upb.onrender.com` (configurado via env vars)

**clients/damian/.env (local):**
- `VITE_API_URL=http://localhost:3000/api/damian`
- En Render: `VITE_API_URL=https://platform-backend-8upb.onrender.com` (configurado via env vars)

## Estado actual (post sesion 14)

### Completado sesion 14
- **M11 COMPLETO (infra + codigo)**: JWT auth full stack desplegado en produccion
  - `prisma db push` ejecutado (tabla users creada en Supabase)
  - Seed ejecutado: 3 usuarios (Ana/zenco, Damian/damian, Jorge/all)
  - JWT_SECRET + REQUIRE_AUTH configurados en Render
  - VITE_API_URL configurado en ambos frontends en Render
  - CORS actualizado con URLs reales (zenko-app.onrender.com, damian-app.onrender.com)
- Zenko service recreado con slug correcto: `zenko-app.onrender.com`
- Vite downgradeado 8→7 (compatibilidad con vite-plugin-pwa)
- jsdom downgradeado 29→25 (compatibilidad con Node 20)
- Express 5 type casts para req.params
- **3 servicios LIVE en Render** — backend + zenko + damian
- Base de conocimiento creada (Prisma/Supabase, stack versions, errores comunes)

### Bugs conocidos activos
- Gemini API key agotada (chat demo y Agent no funcionan)
- N+1 queries en /dashboard/stale-patients y /patients (critico para performance)
- IDs con Date.now() en Order/Appointment/Finance (colision posible)
- Cero loading state en botones submit (doble-click crea duplicados)
- No hay Escape key ni focus trap en ningun modal
- Zenko no tiene config.ts (greeting, repairTypes, currency hardcodeados)
- CI no corre tests frontend
- **Z-BUG**: Calendario fecha de entrega en ingles (debe estar en español) + seleccion de fecha no funciona
- **Z-BUG**: Guardar prenda falla en produccion (investigar: CORS, auth, API path)

## Prioridades ordenadas para sesion 15

### Criticas (performance)
1. **M20** — Fix N+1 queries en stale-patients y patients (docs/roadmap/M20-fix-n-plus-1.md)

### Altas (calidad y estabilidad)
2. **M17** — Loading state en botones submit (docs/roadmap/M17-loading-states.md)
3. **M22** — UUID en todos los modelos (docs/roadmap/M22-uuid-migration.md)
4. **D27** — Tests faltantes en Damian: 10 componentes sin tests (docs/roadmap/D27-tests-faltantes.md)
5. **M12** — CI frontend: agregar tests de ambos clientes al GitHub Action
6. **Z17** — config.ts para Zenko (docs/roadmap/Z17-config-ts.md)
7. **M25** — Renovar Gemini API key (docs/roadmap/M25-gemini-key.md)
8. **D22** — DELETE /appointments/:id + boton eliminar (docs/roadmap/D22-delete-appointments.md)
9. **M16** — Shared packages workspace (docs/roadmap/M16-shared-packages.md)

### Medias (UX y features)
10. **M14** — Escape key + focus trap en modales
15. **M21** — Status enum validation (docs/roadmap/M21-status-enum.md)
16. **M10** — React Router (URLs reales, back/forward, deep linking)
17. **D23** — Editar fichas clinicas desde Patients.tsx
18. **D24** — Filtro "Proximas" vs "Historial" en Appointments
19. **Z9** — WhatsApp quick-send boton "Avisar"
20. **Z10** — Workflow "Entregar" auto-crear ingreso financiero
21. **Z14** — Filtro por status en tabla Garments
22. **Z15** — Highlight filas vencidas en Garments
23. **Z18** — Mostrar deliveryDate e intakeDate en tabla Garments
24. **M19** — Confirm modal custom (reemplazar window.confirm)
25. **M23** — Cache TTL en cachedFetch
26. **Z19** — Revenue widget en Zenko Dashboard
27. **D25** — Revenue widget en Damian Dashboard
28. **Z20 + D26** — DELETE /clients/:id + boton eliminar
29. **M13** — Object storage para fotos (S3/R2)
30. **M15** — Paginacion en endpoints y tablas

### Bajas
31. **M18** — Eliminar console.error leftovers
32. **M24** — Extraer helpers compartidos backend (getMonthRange, etc)
33. **D11** — Vista impresion fichas
34. **Z12** — Export CSV/PDF mensual

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
| `clients/*/src/components/AuthContext.tsx` | Auth context (token storage, login/logout, demo mode) |
| `clients/*/src/pages/Login.tsx` | Login UI (nombre + "Probar Demo" cuando auth disabled) |
| `backend/prisma/seed.ts` | Seed script para usuarios iniciales (Ana, Damian, Jorge) |

## Como empezar

```
continua con el master prompt
```

El agente va a:
1. Leer la memoria persistente y el ROADMAP
2. Verificar el estado actual (git status, test count)
3. Proponer plan para la sesion basado en las prioridades
4. Esperar aprobacion antes de ejecutar
