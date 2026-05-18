# Z38: Snapshot test back↔front del template WhatsApp

## Problematica
`backend/src/lib/whatsapp-zenco-template.ts` y `clients/zenko/src/config/business.ts` son espejos manuales. Un cambio a uno solo introduce drift silencioso — cliente recibe mensaje distinto según si lo dispara backend (auto) vs frontend (manual click). No hay test que verifique paridad.

## Contexto
Detectado en audit 2026-05-18 (MEDIO).

La regla nueva en AGENTS.md exige helper compartido pero no enforce'a paridad runtime/test.

## Implementacion propuesta
1. Crear fixture compartido en `shared/fixtures/whatsapp-zenco.json` con casos: 1 item long, 1 item short, 3 items long, 3 items short, vacío.
2. Test en backend que llame `buildZencoReadyMsg(items, opts)` y compare con `expectedOutput` del fixture.
3. Test en frontend que llame `BUSINESS.whatsappReadyMsg('Ana', items, opts)` y compare con el MISMO `expectedOutput`.
4. Si los outputs difieren, ambos tests fallan → fuerza a actualizar el fixture y ambos archivos.

## Criterio de aceptacion
- Fixture JSON con ≥5 casos compartido por back y front.
- Test backend snapshot pass.
- Test frontend snapshot pass.
- Cambio intencional al template requiere update del fixture + ambos archivos (intencional, no silencioso).

## Notas
- Alternativa más limpia: extraer el helper a `packages/templates/` shared (requiere monorepo M38).
- Hasta entonces, fixture JSON + test paridad es suficiente.
