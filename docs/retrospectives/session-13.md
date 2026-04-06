# Retrospectiva Session 13 — 2026-04-06

## Hecho

| Item | Estado |
|------|--------|
| M11 JWT Auth (full stack) | Completo — backend + frontend + tests |
| Login UI (Zenko + Damian) | Completo — branded, con "Probar Demo" |
| Bearer token en api.ts | Completo — ambos clientes |
| AuthProvider + AuthGate | Completo — ambos App.tsx |
| Seed script (3 usuarios) | Completo — Ana, Damian, Jorge |
| CORS restrictivo | Completo — Render URLs + localhost |
| Auth status endpoint | Completo — GET /api/auth/status |
| Login por nombre | Completo — case insensitive, sin email |
| REQUIRE_AUTH bypass | Completo — modo demo vs produccion |

Tests: 301 (216 backend + 48 zenko + 37 damian) — sin cambios en cantidad

## Arquitectura Auth

```
REQUIRE_AUTH=false (demo):
  Client → Login page → "Probar Demo" → App (bypass, anonymous user)
  Backend → middleware deja pasar todo con user anonymous

REQUIRE_AUTH=true (produccion):
  Client → Login page → nombre + password → JWT → App
  Backend → middleware valida JWT, requireBusiness filtra por negocio
```

## Pendiente infra (para sesion 14)

- [ ] `prisma db push` — Supabase estaba dormida
- [ ] `npx tsx prisma/seed.ts` — crear usuarios
- [ ] JWT_SECRET + REQUIRE_AUTH en Render env vars
- [ ] VITE_API_URL en Render frontends (apunta a localhost)

## Archivos clave modificados/creados

| Archivo | Cambio |
|---------|--------|
| `backend/src/middleware/auth.ts` | REQUIRE_AUTH bypass + isAuthRequired export |
| `backend/src/routes/auth.ts` | GET /status + login por nombre |
| `backend/src/index.ts` | CORS restrictivo |
| `backend/prisma/seed.ts` | Nuevo — seed 3 usuarios |
| `backend/src/schemas.ts` | loginSchema: name en vez de email |
| `clients/*/components/AuthContext.tsx` | Nuevo — auth state + demo mode |
| `clients/*/pages/Login.tsx` | Nuevo — login page con branding |
| `clients/*/services/api.ts` | Bearer token en headers |
| `clients/*/App.tsx` | AuthProvider + AuthGate wrapper |
