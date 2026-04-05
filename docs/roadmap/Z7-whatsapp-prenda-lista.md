# Z7: Notificacion WhatsApp "prenda lista"

## Problematica
Cuando una prenda se marca como lista, solo se crea una notificacion in-app. El cliente real no se entera hasta que abre la plataforma.

## Contexto
Z2 ya crea notificaciones in-app. L1 ya tiene el servicio WhatsApp con sendMessage. Solo falta conectarlos.

## Implementacion propuesta
1. En el trigger de Z2 (PUT /garments/:id/status → listo), ademas de crear Notification, llamar a whatsappService.sendMessage
2. Usar el clientPhone del order como destinatario
3. Mensaje template: "Hola {nombre}, tu prenda ({garmentName}) esta lista para retirar!"
4. Manejar error gracefully si WhatsApp no esta conectado (no bloquear el status update)

## Criterio de aceptacion
- Al marcar prenda como lista, se envia mensaje por WA si hay conexion activa
- Si WA no esta conectado, la notificacion in-app se crea igual sin error
- Test unitario con mock del servicio WA

## Notas
Depende de Z2 + L1 (ambos completados). Requiere que el WhatsApp este conectado con QR.
