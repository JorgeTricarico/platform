# Z35: Skip count + WhatsApp si clientPhone es null/empty

## Problematica
Si dos órdenes tienen `clientPhone=""` (string vacío permitido por schema), el `prisma.order.count` los agrupa como si fueran el mismo cliente → `messageMode='short'` para clientes sin historial real. Peor: backend intenta `whatsappService.sendMessage("", msg)` que falla silenciosamente (o explota si el provider valida).

## Contexto
`backend/src/routes/zenco.ts:158-181` — el flujo de 'listo' asume `clientPhone` válido.

Schema actual permite phone vacío. Validación Zod tampoco lo rechaza para órdenes históricas/manuales.

Detectado en audit 2026-05-18 (categoría ALTO).

## Implementacion propuesta
1. Guard temprano en el path 'listo':
   ```ts
   const phone = updated.clientPhone?.trim();
   if (!phone) {
     // No contar entregas previas, no enviar WhatsApp, no crear notificación dirigida al cliente
     res.json(updated);
     return;
   }
   ```
2. Considerar agregar Zod validation: si la orden se crea con `status='listo'` requerir phone obligatorio.

## Criterio de aceptacion
- Test backend: PUT con `clientPhone=""` → no llama a `prisma.order.count`, no llama a `whatsappService.sendMessage`, no crea notification.
- Test backend: PUT con `clientPhone="   "` (whitespace) → comportamiento idéntico al vacío.
- Frontend: panel pendingNotifications no agrega items sin teléfono o muestra warning "Sin teléfono — no se puede avisar".

## Notas
- Bajo riesgo de regresión: el bug que arregla es silencioso pero contamina la métrica de "cliente con N entregas".
