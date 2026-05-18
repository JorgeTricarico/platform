# Z41: Beep distinto para re-scan unchanged

## Problematica
Cuando Ana re-escanea una prenda al mismo status (`unchanged: true`), el frontend dispara `beep(true)` — exactamente el mismo sonido que un scan exitoso real. Auditivamente Ana no puede distinguir "procesado" de "ya estaba así".

## Contexto
`clients/zenko/src/pages/QRScanner.tsx` — handler de unchanged llama `beep(true)`.

Detectado en audit 2026-05-18 (MEDIO).

## Implementacion propuesta
Agregar tercer tono a `beep()`:
- `beep('success')` — doble tono 1900Hz (igual al actual `beep(true)`).
- `beep('error')` — tono grave (igual al actual `beep(false)`).
- `beep('info')` — tono medio único 1200Hz, más corto. Para unchanged.

Cambiar el handler de unchanged a `beep('info')`.

## Criterio de aceptacion
- Test unit del helper `beep` con 3 modos.
- Manual: scan unchanged se siente distinto pero no alarmante.

## Notas
- Bajo impacto técnico, alto impacto UX para Ana que escanea muchas en serie.
