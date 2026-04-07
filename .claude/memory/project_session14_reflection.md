---
name: Session 14 Reflection
description: M11 infra completado, 3 servicios LIVE en Render, errores de build resueltos
type: project
---

## Session 14 (2026-04-06) — M11 Infra Deploy

Completado M11 JWT auth infra — 3 servicios LIVE en Render con auth habilitado.

**Problemas resueltos:**
- Supabase pooler port 6543 cuelga prisma db push (usar 5432 session mode)
- PrismaClient sin adapter falla en driver adapters mode
- Vite 8 incompatible con vite-plugin-pwa (downgrade a 7)
- jsdom 29 requiere Node 22+ (downgrade a 25)
- Express 5 req.params types necesitan `as string` cast
- VITE_API_URL necesita path completo (/api/zenco, /api/damian)

**Why:** Estos errores bloquearon el deploy por 3 sesiones. Ahora documentados en memoria para no repetir.

**How to apply:** Antes de cualquier deploy futuro, revisar reference_prisma_supabase.md y reference_stack_versions.md.

**Pendiente sesion 15:** M20 (N+1), M17 (loading), M22 (UUID), bug calendario Zenko.
