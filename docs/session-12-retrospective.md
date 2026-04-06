# Sesión 12 — Retrospectiva

**Fecha:** 2026-04-06
**Duración:** ~1 sesión corta
**Tests:** 283 → 301 (+18 nuevos de auth)

## Completado

### M11: JWT Auth (backend) — PARCIAL
- Modelo `User` en Prisma schema
- `jsonwebtoken` + `bcryptjs` instalados
- Rutas `/api/auth/register` y `/api/auth/login`
- Middleware `authenticate` (Bearer token) + `requireBusiness` (zenco/damian/all)
- Todos los endpoints protegidos: zenco → solo users zenco/all, damian → solo damian/all
- `/health` y `/api/auth/*` públicos
- 18 tests nuevos, 216 backend tests pasando
- Todos los test files existentes actualizados con auth headers

### Tooling: Render Visibility
- `scripts/render-status.sh` — status, deploys, logs, env de los 3 servicios
- Service IDs mapeados: backend, zenko-app, damian-app
- Todos los .env documentados en master prompt

### Master Prompt actualizado
- Infraestructura Render (IDs, URLs, tipos)
- Variables de entorno de los 3 proyectos
- Archivos clave actualizados
- M11 estado parcial documentado

## Observaciones

### Build failures en Render
Los últimos deploys de los 3 servicios fallaron en build (commit de ci.yml). El deploy `live` actual es del commit anterior. No afecta producción pero hay que tenerlo en cuenta.

### Cosas que quedaron pendientes de M11
1. **JWT_SECRET** no está en Render env vars — el backend va a crashear en producción sin esto
2. **Login UI** — los frontends no tienen pantalla de login, van a recibir 401 en todos los requests
3. **CORS** — sigue abierto con `cors()` sin restricciones
4. **Migración DB** — la tabla `users` no existe aún en Supabase (solo en el schema local)
5. **Seed script** — no hay forma de crear los usuarios iniciales

### Bugs detectados (no nuevos, confirmados)
- Frontend .env apunta a localhost (no funciona desde Render)
- Último deploy falló en build en los 3 servicios
- Gemini API key agotada (chat demo roto)

## Prioridades para sesión 13

### M11 Completion (CRÍTICO — sin esto el deploy rompe)
1. Crear migración: `npx prisma db push` para tabla users en Supabase
2. Agregar `JWT_SECRET` a Render env vars (backend)
3. Login UI en ambos clientes (formulario simple + token storage)
4. Actualizar `api.ts` en ambos clientes para enviar Bearer token
5. Auto-redirect a login en 401
6. Seed script para usuarios iniciales
7. CORS restrictivo

### Después de M11
8. **M20** — Fix N+1 queries (crítica perf)
9. **M17** — Loading states (doble-click duplicados)
10. **D22** — DELETE appointments

## Métricas
- Tests: 301 total (216 backend + 48 zenko + 37 damian)
- Commits sesión: 2 (auth + render tooling)
- Archivos nuevos: 4 (auth.ts middleware, auth.ts routes, auth.test.ts, render-status.sh)
- Archivos modificados: 16 (schema, schemas, index, setup, 12 test files, package.json)
