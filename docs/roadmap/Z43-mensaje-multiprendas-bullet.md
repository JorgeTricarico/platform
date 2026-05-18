# Z43: Mensaje WhatsApp multi-prendas en bullet list

## Problematica
Cuando una orden tiene 5+ prendas, el mensaje queda en una línea muy larga:
```
✨ Ya están listos: *«campera negra»*, *«pantalón gris»*, *«saco azul»*, *«remera blanca»*, *«bermuda»*
```
Difícil de leer en mobile.

## Contexto
`buildZencoReadyMsg` en backend y `BUSINESS.whatsappReadyMsg` en frontend.

Detectado en audit 2026-05-18 (BAJO).

## Implementacion propuesta
Si `items.length >= 4`, usar formato bullet:
```
✨ Ya están listos:
• *«campera negra»*
• *«pantalón gris»*
• *«saco azul»*
• *«remera blanca»*
• *«bermuda»*
```

Mantener formato actual (separado por coma) para 2-3 items.

## Criterio de aceptacion
- 1 item: `Ya está listo tu *«X»*` (sin cambios).
- 2-3 items: `Ya están listos: *«A»*, *«B»*, *«C»*` (sin cambios).
- 4+ items: bullet list.
- Actualizar fixture de Z38 y ambos templates.

## Notas
- Bajo impacto. Hacer después de Z38 (snapshot test) para garantizar paridad.
