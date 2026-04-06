# M23 — Backend validations: enum status, precio positivo, search vacío

**Prioridad:** ALTA
**Estado:** Pendiente

## Problemas
1. `status` acepta cualquier string — debería ser `z.enum(['recibido', 'en_proceso', 'listo', 'entregado'])`
2. `price` puede ser NaN — `z.string().transform(Number)` no valida resultado. Usar `z.coerce.number().positive()`
3. `/clients/search` sin query devuelve TODOS los clientes — retornar vacío si `q.length < 2`
4. `email` en Client no valida formato — usar `z.string().email()` cuando se provee
5. Date fields no validan formato — aceptan cualquier string

## Archivos
- `backend/src/schemas.ts`
- `backend/src/routes/zenco.ts` (search endpoint)
