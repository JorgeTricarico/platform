---
name: drift-incident-20260517
description: "Incidente de drift Prisma migrations vs DB prod descubierto al probar QR scanner, fix aplicado y plan QA pendiente"
metadata: 
  node_type: memory
  type: project
  originSessionId: b429da6c-61d4-4883-ad12-5d63dabcbf8b
---

Al probar el flujo QR con orden de prueba en prod (script `create-test-order.ts`), el cambio de status a "listo" fallaba con error opaco "Error al actualizar el estado".

**Causa raíz:** `prisma migrate deploy` no aplicaba migraciones nuevas porque la tabla `_prisma_migrations` estaba desincronizada con la DB real. 3 migraciones del repo (`20260501_add_scan_tracking`, `20260517_add_error_logs`, mi nueva `20260517_add_notification_audience`) estaban pendientes, pero las 2 primeras ya tenían sus cambios en la DB (alguien las aplicó con `prisma db push` directo). Cuando el migrate deploy intentaba correrlas, fallaba (objetos ya existen) y abortaba antes de la mía.

**Fix aplicado en la sesión:**
1. `prisma migrate resolve --applied 20260501_add_scan_tracking` (usando `DIRECT_DATABASE_URL`, puerto 5432, no pooler)
2. `prisma migrate resolve --applied 20260517_add_error_logs`
3. `prisma migrate deploy` → aplicó la nueva (`audience`)
4. Verificado: columna `notifications.audience` existe en prod

**Hooks de observabilidad agregados:** `backend/src/middleware/errorHandler.ts` ahora persiste errores 5xx en tabla `error_logs`. Sin esto, el bug habría sido imposible de diagnosticar (Render free logs son ephemeral). Ya disponible: `GET /api/errors?source=backend` (JWT) o query directo a DB con script `backend/scripts/check-errors.ts`.

**Why:** El drift se introdujo previamente al usar `prisma db push` para aplicar cambios sin generar archivo de migration. Romper esa práctica es bloqueador para tener QA confiable.

**How to apply:** Antes de mergear cualquier cambio a `schema.prisma`, generar migration con `prisma migrate dev --name <slug>`. Nunca usar `db push` en prod. Si una columna nueva no aparece en prod tras deploy, primero correr `backend/scripts/check-migrations.ts` para ver qué migraciones están registradas vs cuáles existen en el repo.

**Próximo paso:** Implementar [[M36-ambientes-qa]] (branch DB Supabase + servicios Render QA + CI migrate validation). Sin QA cualquier ALTER TABLE futuro corre el mismo riesgo de romper al cliente real.

Relacionado: [[reference_prisma_supabase]] (puertos pooler/direct), [[reference_render_infra]] (service IDs).
