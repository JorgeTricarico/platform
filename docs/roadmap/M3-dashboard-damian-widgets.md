# M3: Dashboard Damian — Widgets Utiles

## Problematica

El dashboard de Damian muestra informacion generica y basica. Para que sea util como pantalla de inicio de trabajo, necesita mostrar informacion accionable de inmediato: que turnos tiene hoy y que pacientes llevan mucho tiempo sin ficha actualizada.

## Contexto

Actualmente Damian debe navegar a la seccion de citas para ver los turnos del dia, y no tiene ninguna alerta sobre pacientes inactivos. Un dashboard bien diseñado reduce la friccion diaria y mejora la adherencia al sistema.

## Implementacion propuesta

**Widget 1 — Turnos de hoy:**
- Query: citas del dia actual ordenadas por hora.
- Mostrar: hora de la cita + nombre del paciente + tipo de sesion (si existe).
- Endpoint: puede reutilizar `GET /api/damian/appointments` filtrando por fecha = hoy, o agregar un campo `todayAppointments` al response del GET de dashboard.

**Widget 2 — Pacientes sin ficha reciente (>30 dias):**
- Query: clientes cuya ultima `PatientRecord` tiene `createdAt` mayor a 30 dias, o clientes sin ninguna ficha.
- Mostrar: nombre del paciente + fecha de ultima ficha (o "Sin ficha").
- Endpoint: agregar `stalePatients` al GET de dashboard con la lista.

**Implementacion frontend:**
- Dos componentes React nuevos: `TodayAppointmentsWidget` y `StalePatientWidget`.
- Integrarlos en el layout del dashboard existente de Damian.
- Cada widget con estado de carga y estado vacio ("No hay turnos hoy", "Todos los pacientes al dia").

## Criterio de aceptacion

- El dashboard muestra los turnos del dia con hora y nombre del paciente.
- El dashboard muestra pacientes sin ficha en los ultimos 30 dias.
- La informacion es visible sin navegar a otras secciones.
- Los widgets se actualizan al recargar la pagina.

## Notas

- El umbral de 30 dias para "sin ficha reciente" deberia ser configurable o al menos facil de cambiar.
- Si el endpoint de dashboard se vuelve muy pesado, considerar endpoints separados por widget con carga lazy.
- Considerar ordenar "Turnos de hoy" por proximidad temporal (el siguiente turno primero).
