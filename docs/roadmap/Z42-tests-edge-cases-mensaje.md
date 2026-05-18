# Z42: Tests adicionales para edge cases de mensaje WhatsApp

## Problematica
Cobertura actual del endpoint PUT status no incluye:
- `clientPhone=null` o `clientPhone=""` (relacionado a Z35).
- Verificación de que la response **NO** incluye `previousDeliveries`/`messageMode` cuando status != 'listo'.
- Cliente sin órdenes previas devuelve mode='long'.
- Frontend assumption: condicional ausencia/presencia de campos.

## Contexto
`backend/src/__tests__/zenco.test.ts` — tests actuales cubren happy path con phone válido.

Detectado en audit 2026-05-18 (BAJO).

## Implementacion propuesta
Agregar tests:
1. `it('does NOT include previousDeliveries/messageMode when status -> entregado')`.
2. `it('does NOT include previousDeliveries/messageMode when status -> en_proceso')`.
3. `it('handles clientPhone null gracefully (no count, no WhatsApp)')` — necesita Z35 primero.
4. Snapshot del response shape para cada transición.

## Criterio de aceptacion
- +4 tests pasando.
- Schema del response documentado.

## Notas
- Útil como referencia para evolución del endpoint en el futuro.
