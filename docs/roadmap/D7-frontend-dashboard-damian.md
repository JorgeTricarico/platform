# D7: Frontend Dashboard Damian — Widgets React

## Problematica
Los endpoints del dashboard de Damian ya existen (turnos de hoy, pacientes sin ficha, citas agendadas) pero no hay UI que los consuma. Damian sigue sin pantalla de inicio util.

## Contexto
Backend implementado en sesion 3 (2026-04-05):
- `GET /api/damian/dashboard/today` — turnos del dia
- `GET /api/damian/dashboard/stale-patients` — pacientes >30 dias sin ficha
- `GET /api/damian/dashboard/appointments` — todas las citas futuras (excluye canceladas)

El dashboard actual de Damian muestra info generica.

## Implementacion propuesta
- Crear componente `TodayAppointmentsWidget` — lista de turnos del dia con hora y nombre
- Crear componente `StalePatientWidget` — pacientes sin ficha reciente con alerta visual
- Crear componente `UpcomingAppointmentsWidget` — vista de agenda con citas futuras
- Integrar en el layout del dashboard existente de Damian
- Cada widget con estado de carga y estado vacio

## Criterio de aceptacion
- Los 3 widgets se muestran en el dashboard de Damian
- Se actualizan al recargar la pagina
- Estados vacios muestran mensajes amigables

## Notas
- Considerar ordenar turnos de hoy por proximidad temporal
- El umbral de 30 dias para stale patients deberia ser facil de cambiar
