# Z9 — Fix validación cliente existente en orden

**Prioridad:** CRITICA
**Estado:** Pendiente

## Problema
En el modal de crear orden, modo "Cliente existente", los hidden inputs con `required` no son validados por los browsers. El formulario se puede submitear sin haber seleccionado un cliente.

## Solución
Validar en el `handleSubmit` que `form.clientName` y `form.clientPhone` no estén vacíos cuando `clientMode === 'existing'`. Mostrar toast de error si faltan.
