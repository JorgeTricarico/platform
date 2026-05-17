# M43: Alertas internas para staff (audience='staff')

## Problematica
En la sesion 2026-05-17 separamos las notificaciones por audiencia (`client` vs `staff`) para sacar de la campana de Ana los avisos en 2da persona destinados a los clientes finales. La campana ahora queda vacia porque todavia no hay flujos que generen alertas reales para el staff. Necesitamos definir y construir esos generadores para que la campana vuelva a ser util.

## Contexto
- Modelo `Notification` tiene `audience String @default("client")` con index.
- `GET /api/zenco/notifications/:clientId?audience=staff` ya filtra.
- `NotificationBell` pide `audience='staff'`.
- Hoy ningun codigo crea `audience: 'staff'`.

## Implementacion propuesta
Tres fuentes de alertas para Ana (alta prioridad → baja):

### 1. Cliente respondio por WhatsApp (futuro)
Cuando se implemente inbound de Baileys (`whatsappService.onMessage` handler), si el `from` matchea un client conocido, crear notif:
```
{ audience: 'staff', type: 'cliente_consulto', clientId, message: 'Maria (#54-XXX) escribio: "...preview..."' }
```
- Click en la notif → abrir vista de conversacion (a definir, podria ser modal con el thread).

### 2. Orden vencida sin retirar
Job programado (cron o trigger on-read del dashboard) que:
- Busca `Order.status='listo'` con `statusChangedAt < now - 7 dias` (configurable).
- Por cada uno, upsertea una notif con `topic_key='alerta_pendiente_${orderId}'` para no duplicar.
- Mensaje: "ORD-XXX (Cliente) lista hace N dias sin retirar. ¿Recordarle?".
- Click → abrir orden con boton "Avisar" prellenado.

### 3. Stock bajo (si se agrega gestion de stock — diferido)
Cuando exista modelo `Stock`, alertar si `quantity < min_quantity`.

## Criterio de aceptacion
- Al menos 1 generador implementado (la #2 es la mas barata y no depende de inbound WhatsApp).
- Tests: el job cron crea notif staff con datos correctos; idempotencia (no duplica).
- La campana de Ana muestra los items y permite marcarlos como leidos.
- Doc en CLAUDE.md del flujo para que futuros generadores sigan la convencion.

## Notas
- Decidir si el cron corre en el backend (Render free dyno se duerme) o si se ejecuta on-demand cuando se abre el dashboard.
- Considerar throttling: no spammear con la misma alerta si Ana no la atiende.
- En el medio plazo conviene un campo `topic_key` o `dedupe_key` para idempotencia.
