# Z28: QR Scanner — layout full viewport sin scroll

## Problematica
La pagina del Escaner QR en desktop renderiza dentro de `max-w-lg mx-auto space-y-5` — la camara queda chica al centro y el contenido empuja al scroll vertical (controles arriba, video, lista de prendas vencidas abajo). En un mostrador con monitor fijo, donde alguien usa el scanner mientras atiende, esto es incomodo: hay que scrollear para alternar entre escanear y ver lista.

## Contexto
- `clients/zenko/src/pages/QRScanner.tsx` ya tiene:
  - Camara con `jsQR` + `getUserMedia`
  - 3 modos `en_proceso` / `listo` / `entregado`
  - Modal de resultado bloqueante con info y acciones (WhatsApp, cobro)
  - Lista de stale garments al final
  - Beep de feedback
- El layout `max-w-lg` viene de la version mobile-first original.

## Implementacion propuesta
- Detectar viewport ≥ md y aplicar layout split:
  - Panel izquierdo (60-70% ancho): camara grande aspect-ratio fijo, ocupando casi toda la altura.
  - Panel derecho (40-30%): controles de modo arriba, historial de escaneos (Z30) y lista de stale en cards scrolleables.
- En mobile mantener flujo vertical actual.
- Usar `h-[calc(100vh-header)]` o flex-1 + overflow-hidden para que el viewport no scrollee.
- Asegurar que el modal bloqueante (`alert`) sigue funcionando sin que la camara siga corriendo en background.

## Criterio de aceptacion
- En desktop ≥ 768px, la pagina ocupa exactamente el viewport (no hay scroll vertical).
- La imagen de camara es el elemento dominante (60%+ del ancho disponible).
- Controles de modo siempre visibles sin scroll.
- Tests: render con jsdom viewport simulado para verificar que no hay `overflow-y-auto` en el contenedor principal.

## Notas
- Cuidar el `max-h` del video para que no estire la cara del operario en monitores ultra-wide.
- Considerar `flex-direction: column` en mobile vs `flex-direction: row` en desktop.
