# Z34: Race condition en PUT /garments/:id/status

## Problematica
`findUnique` + guard `if (prev.status === status)` + `update` no están en transacción. Dos PUT concurrentes con mismo target leen el mismo `prev`, ambos pasan el guard, ambos ejecutan toda la lógica de transición → doble notificación, doble registro en `ZencoFinance`, doble WhatsApp.

## Contexto
Ana puede escanear rápido con QR el mismo código por rebote de cámara antes de que `cooldownRef` se active. Con Render auto-restart o múltiples instancias del backend (M40 multi-tenant), el riesgo crece.

Detectado en audit de sesión 2026-05-18, archivo `backend/src/routes/zenco.ts:128-204`.

## Implementacion propuesta
Opción A (recomendada): usar `updateMany` atómico con guard de status como filtro.

```ts
const result = await prisma.order.updateMany({
  where: { id, status: { not: status } },
  data: { status, statusChangedAt: new Date().toISOString() },
});
if (result.count === 0) {
  // no actualizó nada — o no existe o ya estaba en ese status
  const exists = await prisma.order.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new NotFoundError(...);
  return res.json({ unchanged: true, status, ... });
}
// continuar con notifications/finance/whatsapp
```

Opción B: `prisma.$transaction` envolviendo todo el flujo + `isolationLevel: 'Serializable'`.

## Criterio de aceptacion
- Test concurrente: dos requests simultáneos al mismo `id` con mismo target status → exactamente uno procesa la transición, el otro recibe `unchanged: true`.
- Test concurrente con diferentes target status (en_proceso → listo simultáneo con listo → entregado) → ambos no pueden ganar, primero gana.
- No regresar el comportamiento happy path actual.

## Notas
- Prioridad **CRITICA**: bug de integridad de datos en prod.
- Considerar si vale la pena agregar idempotency key opcional (`X-Request-ID`) para que el cliente pueda re-intentar de forma segura.
