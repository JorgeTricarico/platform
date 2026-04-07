# Z21: Client Search Live Feedback

## Problematica
El buscador de clientes al crear una orden no daba feedback visual.
No mostraba resultados mientras se escribia, ni indicaba cuando no habia matches.

## Contexto
- El search ya tenia debounce (300ms) y llamaba a `searchClients` API
- Pero el dropdown solo se abria si habia resultados (`results.length > 0`)
- Sin resultados: no pasaba nada visible — usuario no sabia si estaba buscando o si no encontro

## Implementacion
1. Agregar estado `searching` para tracking de fetch en progreso
2. Mostrar dropdown siempre que `clientQuery.length >= 2`:
   - `searching === true` → "Buscando..."
   - `results.length > 0` → lista de clientes clickeables
   - `results.length === 0 && !searching` → "No se encontraron clientes"
3. Actualizar `onFocus` para reabrir dropdown basado en query length, no en results previos

## Criterio de aceptacion
- Al escribir 2+ caracteres: aparece "Buscando..."
- Si hay resultados: se muestran inmediatamente
- Si no hay: "No se encontraron clientes"
- Tests existentes siguen pasando

## Notas
- Performance: no hay throttling adicional necesario — pocos clientes por ahora
- Futuro: si escala, considerar virtual scrolling o server-side pagination
