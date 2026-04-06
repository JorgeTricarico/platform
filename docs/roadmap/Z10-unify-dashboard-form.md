# Z10 — Unificar form de orden en Dashboard con GarmentModal

**Prioridad:** CRITICA
**Estado:** Pendiente

## Problema
Dashboard.tsx tiene su propio formulario de crear orden, copia vieja sin `intakeDate`, sin "Otro" en tipo de arreglo, sin búsqueda de cliente. Dos paths para crear la misma entidad = datos inconsistentes.

## Solución
Extraer `GarmentModal` a `components/GarmentModal.tsx`. Importarlo en Dashboard y Garments. Eliminar el form duplicado del Dashboard.
