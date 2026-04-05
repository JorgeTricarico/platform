# D27: Tests Faltantes en Damian

## Problematica
Damian tiene 10 componentes/páginas sin tests: Dashboard, Patients, Agent, Ambient, ChatDemo, TodayAppointmentsWidget, UpcomingAppointmentsWidget, StalePatientWidget, MusicContext, OfflineIndicator.

## Contexto
Zenko tiene mucho mejor cobertura. Damian solo tiene tests para: Appointments, Clients, Finances, ToastContext, exportPdf.

## Implementacion propuesta
Por prioridad:
1. Dashboard.test.tsx — widgets, quick-create modal
2. Patients.test.tsx — lista, selección, ficha clínica, PDF export
3. TodayAppointmentsWidget.test.tsx + UpcomingAppointmentsWidget.test.tsx + StalePatientWidget.test.tsx
4. Agent.test.tsx — chat input, message rendering, function calls
5. Ambient.test.tsx — track list, play/pause, volume
6. OfflineIndicator.test.tsx — online/offline toggle

## Criterio de aceptacion
- Todos los componentes tienen al menos tests básicos (render, interacción principal)
- Test count de Damian supera los 60 tests

## Notas
MusicContext y ChatDemo son más complejos de testear (audio API, fetch streaming). Pueden dejarse para después.
