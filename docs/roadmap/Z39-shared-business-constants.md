# Z39: Compartir address/schedule entre backend y frontend

## Problematica
Dirección "Independencia 243, Morón" y horarios están hardcodeados en `backend/src/lib/whatsapp-zenco-template.ts:7-9` y en `clients/zenko/src/config/business.ts`. Si Ana cambia la dirección en el frontend config, el backend queda obsoleto y los mensajes auto-enviados muestran datos viejos.

## Contexto
Detectado en audit 2026-05-18 (MEDIO).

## Implementacion propuesta
Opción A (simple): exponer endpoint `GET /api/zenco/config` que devuelve address/schedule. Backend template hace fetch al endpoint en cold start y cachea en memoria.

Opción B (mejor): mover constantes a un JSON en `shared/zenco-business.json` que ambos importan.

Opción C (depende de M38 monorepo): package `@zenko/business-config` consumido por ambos.

## Criterio de aceptacion
- Cambio de dirección en un único lugar refleja en mensajes backend Y frontend.
- Tests no rompen.

## Notas
- Baja urgencia: la dirección no cambia seguido. Pero deja la base lista para multi-tenant (cada cliente con sus constantes).
