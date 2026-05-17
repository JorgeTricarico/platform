---
name: notifications-audience-bug
description: Bug RESUELTO — campana de Ana mostraba notificaciones que eran para clientes. Fix con campo audience implementado el 2026-05-17.
metadata: 
  node_type: memory
  type: project
  originSessionId: 1c9ef817-39c3-446a-833c-9d9a6f2b344f
---

**Estado:** RESUELTO en 2026-05-17 (commit pendiente de identificar tras push). El bug consistía en que `NotificationBell` (campana de Ana) consumía `GET /api/zenco/notifications/all` sin filtro y mostraba TODAS las notificaciones del modelo `Notification`, incluidos los avisos en 2da persona generados automaticamente cuando una orden pasa a `listo` (en `backend/src/routes/zenco.ts:144`) — esos están dirigidos al cliente final, no a Ana.

**Solucion aplicada:**
1. `prisma/schema.prisma` — modelo Notification ahora tiene `audience String @default("client")` con `@@index([audience])`.
2. `backend/src/routes/notifications.ts` — `GET /:clientId` acepta query `?audience=staff|client`. Valida valores (400 si invalido). Sin query mantiene compat con clientes que aun no lo pasan.
3. `backend/src/routes/zenco.ts:144` — crear notif con `audience: 'client'` explicito.
4. `clients/zenko/src/services/api.ts` — `fetchNotifications(clientId, audience?)` agrega el query param.
5. `clients/zenko/src/components/NotificationBell.tsx` — pide `audience='staff'`. Empty state cambia a "Sin alertas".
6. Pagina nueva `clients/zenko/src/pages/ClientNotifications.tsx` en tab "Avisos a Clientes" del sidebar — lista `audience='client'` para que Ana vea el historial.
7. `backend/scripts/backfill-notification-audience.ts` — script idempotente (dry-run por defecto, `--apply` para escribir) que setea audience='client' a registros pre-migracion sin valor.

**Cobertura de tests:**
- Backend: 5 tests nuevos (`filters by audience=staff`, `=client`, combina clientId+audience, ignora si query ausente, 400 si invalido) + assertion en el test de creacion auto que verifica audience='client'.
- Frontend: test de NotificationBell actualizado para esperar `fetchNotifications('all', 'staff')`. 4 tests nuevos para ClientNotifications page (consulta correcta, render filas, empty state, titulo).

**Pendiente futuro (no para esta sesion):**
- Hacer una migracion Prisma formal con `prisma migrate` cuando se pueda parar la DB (hoy fue solo schema + generate sin migrate, porque el ALTER TABLE va a aplicarse cuando Prisma migrate se ejecute en deploy). El script de backfill cubre el caso de que `prisma migrate dev` no setee el default a las filas existentes.
- Generar alertas reales de `audience='staff'` cuando se implemente: cliente respondio por WhatsApp, stock bajo, orden retrasada > N dias.

**Mensaje para Ana:** cuando deployemos esto, la campana va a quedar vacia (porque todas las alertas existentes son audience=client). Eso es lo correcto. Ana ahora puede ir a "Avisos a Clientes" en el sidebar para ver el historial.
