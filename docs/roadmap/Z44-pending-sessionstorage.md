# Z44: Persistir pendingNotifications en sessionStorage

## Problematica
El panel "Avisar por WhatsApp" pierde todas las entries si Ana refresca la página o cierra/abre la pestaña. Si tenía 5 listos sin avisar, se pierden — tiene que re-escanear.

## Contexto
`clients/zenko/src/pages/QRScanner.tsx` — `pendingNotifications` es solo estado React.

Detectado en audit 2026-05-18 (BAJO).

## Implementacion propuesta
Hook `usePersistedState('zenco-pending-notifications', [], sessionStorage)`:
- Lee de sessionStorage al mount.
- Escribe en cada cambio.
- Borra al cerrar tab (sessionStorage natural).

Considerar `localStorage` si Ana quiere que sobreviva tab close — pero entonces se acumula con el tiempo. Dejar `sessionStorage` por defecto.

## Criterio de aceptacion
- Test: refresh manual mantiene pending.
- Cierre y reapertura de tab → limpia pending (comportamiento sessionStorage).
- Migration entry inválido (cambio de schema): tolerar gracefully.

## Notas
- Compatible con Z37 (sync con garmentsRef) — al rehidratar, también filtrar contra estado actual.
