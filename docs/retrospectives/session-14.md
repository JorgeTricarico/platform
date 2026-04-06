# Session 14 — Retrospectiva (2026-04-06)

## Resumen

M11 JWT Auth infra completado. Los 3 servicios desplegados en Render con auth habilitado.

## Que se hizo

| Tarea | Detalle |
|-------|---------|
| prisma db push | Tabla users creada en Supabase (pooler session mode, port 5432) |
| Seed ejecutado | 3 usuarios: Ana/zenco, Damian/damian, Jorge/all |
| Render env vars | JWT_SECRET, REQUIRE_AUTH=true en backend |
| VITE_API_URL | Corregido en ambos frontends con path completo (/api/zenco, /api/damian) |
| CORS actualizado | URLs reales: zenko-app.onrender.com, damian-app.onrender.com |
| Zenko service recreado | Nuevo slug: zenko-app.onrender.com (antes platform-ypkr) |
| Vite 8 -> 7 | Compatibilidad con vite-plugin-pwa (no soporta vite 8) |
| jsdom 29 -> 25 | Compatibilidad con Node 20 (jsdom 29 requiere Node 22+) |
| Express 5 type casts | req.params as string en todas las rutas |
| TS verbatimModuleSyntax | type imports en AuthContext y Login |
| Seed script fix | Adapter pg + path correcto (prisma/seed.ts) |
| Base de conocimiento | Prisma/Supabase guide + stack versions en memoria persistente |
| 3 servicios LIVE | Backend + Zenko + Damian desplegados en Render |

## Problemas encontrados y resueltos

1. **Pooler port 6543 cuelga prisma db push** — Solucion: usar port 5432 (session mode)
2. **URL directa Supabase no funciona** — db.PROJECT.supabase.co:5432 da P1001, usar pooler siempre
3. **PrismaClient sin adapter** — Seed usaba `new PrismaClient()` sin adapter-pg, falla en driver adapters mode
4. **Seed path incorrecto** — package.json apuntaba a src/seed.ts, archivo real en prisma/seed.ts
5. **vite-plugin-pwa vs Vite 8** — No hay version compatible, downgrade a vite 7
6. **jsdom 29 + Node 20** — ESM top-level await falla con require(), downgrade a jsdom 25
7. **Express 5 req.params types** — `string | string[]` requiere cast `as string`
8. **verbatimModuleSyntax** — Type imports necesitan `type` keyword
9. **VITE_API_URL sin path** — Faltaba /api/zenco y /api/damian
10. **Render slug inmutable** — Recrear servicio para cambiar URL

## Metricas

- Tests: 301 (216 backend + 48 zenko + 37 damian) — todos verdes
- Commits: 4 (feat + 3 fixes)
- Servicios desplegados: 3/3 LIVE

## Pendiente para sesion 15

1. **M20** — Fix N+1 queries (stale-patients, patients)
2. **M17** — Loading states en submit buttons
3. **M22** — UUID migration
4. **D27** — Tests faltantes Damian
5. **M12** — CI frontend tests
6. Probar login en produccion (verificar flujo completo)
