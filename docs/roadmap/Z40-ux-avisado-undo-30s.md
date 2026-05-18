# Z40: UX "Avisado ✓" con undo de 30s en panel pending

## Problematica
El botón "Avisar" en el panel "Avisar por WhatsApp" remueve la entry inmediatamente al click. Si Ana se equivoca, no hay forma de volver a abrir el mensaje sin re-escanear la prenda.

## Contexto
`clients/zenko/src/pages/QRScanner.tsx` — `handleClick` hace `setPendingNotifications(prev => prev.filter(...))`.

Detectado en audit 2026-05-18 (MEDIO).

## Implementacion propuesta
Patrón similar a undo de Z30 (historial 60s).

1. Agregar campo `notifiedAt?: number` a `PendingNotification`.
2. Al click Avisar: setear `notifiedAt = Date.now()` en vez de filtrar.
3. Render: si `notifiedAt`, mostrar ✓ verde + countdown 30s. Después de 30s, filter out via effect con timer.
4. Botón "Volver a abrir" dentro de los 30s reabre la entry (reset `notifiedAt = undefined`).

## Criterio de aceptacion
- Click Avisar marca con ✓ + countdown visible.
- Click "Volver a abrir" dentro de 30s reabre.
- A los 30s, entry desaparece automáticamente.
- Test RTL con fake timers.

## Notas
- Reusar el patrón ya implementado para Z30 (HistoryEntry undo).
