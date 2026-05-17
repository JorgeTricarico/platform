# Z31: QR Scanner — Modo bulk, cobro al entregar, atajos de teclado

## Problematica
Tres mejoras de productividad que comparten contexto (la pagina del scanner):

1. **Modo bulk**: cuando llegan 10 prendas del taller para pasarlas todas a `listo`, el modal bloqueante por cada scan obliga a 10 confirmaciones.
2. **Cobro al entregar**: hoy `entregado` calcula el saldo y crea un `ZencoFinance` con categoria `entrega_prenda`, pero no captura el metodo de pago (efectivo / transferencia / tarjeta). Eso despues complica el corte de caja.
3. **Atajos de teclado**: cambiar de modo requiere click; un operario con manos ocupadas pierde tiempo.

## Contexto
- `routes/zenco.ts` ya tiene la creacion automatica del finance entry cuando status=entregado (commit `0995c6e`, M3 idempotente con `FIN-Z-STATUS-X`).
- `ZencoFinance` tiene campo `category` pero no `paymentMethod`.
- Layout actual es manejado con click — no hay keyboard listeners.

## Implementacion propuesta

### Bulk
- Toggle "Modo bulk" en los settings (Z29).
- Cuando esta activo: el modal de resultado se reemplaza por un toast verde flotante de 1.5s + el beep.
- Cooldown de scan baja a 800ms (de 2s) para escaneo rapido.
- Boton "Resumen" muestra modal con la lista de la sesion (reusa Z30).

### Cobro
- Nuevo campo `paymentMethod String?` en `ZencoFinance` (nullable para registros viejos).
- Cuando se escanea en modo `entregado` y `remaining > 0`, agregar selector de metodo al modal: chips "Efectivo / Transferencia / Tarjeta / Mixto" antes de cerrar.
- Persistir el metodo en el FIN entry correspondiente (PUT post-creacion o pasar al PUT del status).
- Soportar `paymentMethod` en `auto-action` (Z29): default elegido pre-seteado.

### Atajos
- Listeners globales en la pagina:
  - `1` → modo `en_proceso`
  - `2` → modo `listo`
  - `3` → modo `entregado`
  - `Esc` → cerrar modal / cancelar bulk
  - `U` → deshacer ultimo (Z30)
- Tooltip con el atajo en cada boton de modo.

## Criterio de aceptacion
- Bulk: 10 scans seguidos no requieren click, solo beep + toast.
- Cobro: nueva columna `paymentMethod` en `ZencoFinance`, migration idempotente, GET /finances lo devuelve, UI lo respeta.
- Atajos: tests con `fireEvent.keyDown` verifican el cambio de modo.

## Notas
- Para bulk + cobro: si esta en bulk + entregado, hay que decidir si pregunta payment method en cada scan o asume uno default (configurable).
- Atajos no deben dispararse si hay un input enfocado (chequear `document.activeElement`).
- Considerar conflicto: si Ana usa scanner USB de codigos de barra, las teclas numericas pueden venir como input del scanner.
