# Z29: QR Scanner — Modo Mostrador (auto-start + auto-accion)

## Problematica
Hoy al entrar a la pagina hay que tocar "Activar camara" y, despues de cada scan, hay que confirmar la accion en el modal. En un mostrador donde el operario tiene las manos ocupadas (envolviendo prenda, cobrando), cada toque suma friccion. Una PC dedicada del mostrador podria estar siempre lista para escanear sin intervencion.

## Contexto
- Pagina `QRScanner.tsx` ya tiene `startCamera` + `stopCamera`.
- Modal de resultado se cierra solo despues de `ALERT_DURATION` (4s) pero requiere tocar para ejecutar la accion (WhatsApp / cobro).
- No hay configuracion persistida — el modo seleccionado se reinicia con cada visita.

## Implementacion propuesta
- Agregar settings persistidos en `localStorage` (key `qr-scanner-settings`):
  - `autoStart: boolean` — al entrar a la pagina, encender camara automaticamente.
  - `autoAction: 'off' | 'whatsapp' | 'print'` — al pasar a `listo`: si `whatsapp` abre el wa.me; si `print` imprime ticket.
  - `defaultMode: ScanMode` — modo inicial al entrar.
- Panel de "Ajustes del mostrador" colapsable arriba a la derecha (icono engranaje).
- Cuando `autoAction !== 'off'`, despues del beep, ejecutar la accion sin modal o con modal de 2s solo informativo.
- Persistir el `defaultMode` ultimo seleccionado.

## Criterio de aceptacion
- localStorage guarda settings entre reloads.
- Con `autoStart=true`, al entrar la camara se prende sin click (manejar permiso denegado con mensaje).
- Con `autoAction=whatsapp` y modo `listo`, al escanear abre wa.me en nueva tab sin modal de confirmacion.
- Tests: settings se persisten, settings invalidos no rompen la pagina, accion se dispara cuando corresponde.

## Notas
- Auto-print requiere que el browser tenga la impresora configurada como default — no hay forma de "elegir" desde JS, abre el dialogo nativo.
- Para auto-WhatsApp considerar que `window.open` con popup blocker activo puede fallar — usar `<a>` con click programatico.
- Privacy: si la PC es compartida, cuidar que `defaultMode='entregado'` no este accidentalmente activo y alguien marque cosas por error.
