---
name: Session 13 Reflection
description: M11 JWT auth full stack completado — login por nombre, modo demo, REQUIRE_AUTH switch, pendiente infra Render
type: project
---

Session 13 (2026-04-06): M11 JWT auth completo (full stack).

**Completado:**
- Login UI en ambos clientes (branded, con boton "Probar Demo")
- AuthContext + AuthGate en ambos App.tsx
- Bearer token en ambos api.ts (cachedFetch, mutationFetch, uploadGarmentPhoto)
- REQUIRE_AUTH bypass en middleware — modo demo vs produccion
- GET /api/auth/status endpoint
- CORS restrictivo (Render URLs + localhost)
- Seed script (Ana/zenco, Damian/damian, Jorge/all)
- Login por nombre (case insensitive, sin email)
- 301 tests passing

**PENDIENTE infra (sesion 14):**
- `prisma db push` — Supabase estaba dormida/unreachable
- `npx tsx prisma/seed.ts` — crear usuarios en DB
- JWT_SECRET + REQUIRE_AUTH como env vars en Render
- VITE_API_URL en Render frontends (siguen apuntando a localhost)

**Why:** M11 era bloqueante — toda la sesion se dedico a completarlo. El backend ya tenia auth pero faltaba frontend, UI, token management, y el modo demo.

**How to apply:** Sesion 14 debe arrancar con la infra pendiente (DB push + seed + env vars en Render). Luego puede avanzar con items del roadmap normalmente.
