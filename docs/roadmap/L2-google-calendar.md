# L2: Sincronizacion con Google Calendar

## Problematica

Damian agenda turnos en la app pero esos turnos no se reflejan en su Google Calendar. Tiene que revisar dos lugares distintos, lo que genera confusion y riesgo de doble-booking.

## Contexto

El sistema de appointments de Damian guarda turnos en la base de datos de Supabase. Sin embargo, Damian (y potencialmente sus clientes) usan Google Calendar como herramienta principal de gestion de tiempo. La desconexion entre ambos sistemas crea friccion operativa.

## Implementacion propuesta

- Integrar Google Calendar API con autenticacion OAuth2.
- Implementar sincronizacion bidireccional:
  - Al crear un appointment en la app → crear evento en Google Calendar.
  - Al cancelar un appointment en la app → eliminar/marcar como cancelado en Google Calendar.
  - Al crear un evento en Google Calendar → reflejarlo en la app (opcional, fase 2).
- Guardar el `google_event_id` en la tabla de appointments para poder actualizarlo o eliminarlo.
- El flujo OAuth debe permitir que Damian conecte su cuenta de Google desde la app.

## Criterio de aceptacion

- Crear un turno en la app genera automaticamente un evento en el Google Calendar de Damian.
- Cancelar un turno en la app elimina o actualiza el evento correspondiente en Google Calendar.
- El evento incluye titulo, fecha, hora, nombre del cliente y servicio agendado.

## Notas

- Guardar tokens OAuth de forma segura (encriptados en DB, nunca en frontend).
- Manejar token refresh automaticamente para no requerir re-autenticacion frecuente.
- Considerar webhook de Google Calendar para sync en tiempo real (alternativa a polling).
