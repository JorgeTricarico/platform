# Z30: QR Scanner — Historial de sesion + deshacer ultimo

## Problematica
Si Ana marca por error una prenda como `entregado` (escaneo equivocado, distraccion), hoy no hay un undo rapido. Tendria que ir a "Ordenes", buscar la prenda, abrir el modal, cambiar status. Eso si recuerda cual fue.

## Contexto
- `QRScanner.tsx` ya tiene el `alert` con la ultima accion pero solo persiste en pantalla 4s.
- No hay registro local de la actividad de la sesion.
- El backend acepta cambios de status idempotentes — puede revertir sin side effect (excepto que `entregado` genera ingreso financiero via `Z10`).

## Implementacion propuesta
- Mantener un `useRef<ScanResult[]>` con los ultimos 10 scans de la sesion.
- Panel lateral derecho (en desktop, Z28) o accordion (mobile) con la lista:
  - Hora, ORD-XXX, cliente, status aplicado, mini chip de prenda.
- Boton "Deshacer" en cada fila — solo activo en los ultimos 60s y para items que no salieron de la sesion.
- Al deshacer:
  - PUT al status anterior.
  - Si `entregado` → revertir, hay que avisar al user que el ingreso financiero `FIN-Z-STATUS-X` queda en DB y debe revisarse (no auto-borrar, para auditoria).
- Persistir historial en `sessionStorage` para sobrevivir refresh.

## Criterio de aceptacion
- Tras escanear, la accion aparece en el panel con timestamp.
- Click en "Deshacer" llama al backend con el status previo y actualiza el panel.
- Deshacer un `entregado` muestra warning "Revisar finanzas, el ingreso quedo registrado".
- Tests: hist crece hasta 10, undo llama API correctamente, refresh mantiene historial.

## Notas
- Para que undo de `entregado` sea limpio, podria considerarse borrar el `FIN-Z-STATUS-X` correspondiente. Decision diferida para no romper auditoria.
- Cuidar concurrencia: si el status cambio entre el scan y el undo (otra ventana), el PUT puede fallar — mostrar error claro.
