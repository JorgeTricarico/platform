# Z2: Notificacion "prenda lista" al cliente

## Problematica
Cuando una prenda pasa a estado "listo", el cliente no se entera hasta que Ana lo llama manualmente.

## Contexto
El flujo actual es: recibido -> en_proceso -> listo -> entregado. No hay notificacion automatica.

## Implementacion propuesta
1. Al cambiar status a "listo", generar notificacion in-app
2. Fase 2: enviar mensaje WhatsApp automatico al clientPhone (depende de L1)
3. Registrar en DB que la notificacion fue enviada

## Criterio de aceptacion
- Al hacer PUT /garments/:id/status con status="listo", se genera notificacion
- Test que verifique el trigger

## Notas
Depende de M4 (notificaciones in-app) y L1 (WhatsApp) para el canal real.
