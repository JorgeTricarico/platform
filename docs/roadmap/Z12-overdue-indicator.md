# Z12 — Indicador visual de órdenes vencidas

**Prioridad:** ALTA UX
**Estado:** Pendiente

## Problema
Si `deliveryDate < hoy` y `status !== 'entregado'`, no hay ninguna señal visual. Las órdenes vencidas se mezclan con las normales.

## Solución
En la tabla, mostrar la fecha de entrega en rojo con ícono de alerta cuando la orden está vencida. Opcionalmente agregar un filtro "Vencidas" en los chips de estado.
