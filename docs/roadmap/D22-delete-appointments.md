# D22: DELETE /appointments/:id

## Problematica
No existe endpoint DELETE para citas ni botón en el frontend. La única forma de "eliminar" una cita es cambiar su status a "cancelado", pero el registro permanece visible.

## Contexto
CRUD de appointments: GET (list), POST (create), PUT /status (status change), PUT /:id (full edit). Falta DELETE.

## Implementacion propuesta
1. Backend: agregar `DELETE /appointments/:id` en damian.ts
2. Backend: test en damian.test.ts
3. Frontend api.ts: agregar `deleteAppointment(id)`
4. Frontend Appointments.tsx: agregar botón "Eliminar" con confirm modal
5. Tests frontend

## Criterio de aceptacion
- DELETE /appointments/:id retorna 200
- Frontend muestra botón eliminar por fila
- Confirm antes de eliminar
- Tests backend y frontend

## Notas
Evaluar si el soft-delete (status=cancelado) es preferible al hard-delete para mantener historial.
