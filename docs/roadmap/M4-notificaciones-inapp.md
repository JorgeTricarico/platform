# M4: Notificaciones In-App

## Problematica

No hay forma de que Ana o Damian sepan que algo requiere atencion sin revisar manualmente cada seccion. Turnos proximos o prendas listas sin entregar pasan desapercibidos, generando olvidos operativos.

## Contexto

Ambos negocios tienen eventos temporales criticos: Damian tiene turnos con horario; Ana tiene prendas que quedan listas y esperan ser entregadas. Sin alertas proactivas, el sistema es reactivo — el usuario tiene que ir a buscarlo. Las notificaciones in-app son el primer paso antes de notificaciones por WhatsApp o email.

## Implementacion propuesta

**Backend:**
- Endpoint `GET /api/{business}/notifications` que devuelve alertas activas.
- Logica de alertas:
  - Damian: citas con `startTime` en los proximos 30 minutos.
  - Ana: ordenes con estado "lista" cuya fecha de lista supera los 3 dias sin entrega.
- Cada alerta tiene: `id`, `type`, `message`, `entityId`, `createdAt`.

**Frontend — opcion A (polling):**
- Hook `useNotifications()` que llama al endpoint cada 60 segundos.
- Badge en el topbar con el conteo de alertas no leidas.
- Panel desplegable o drawer con la lista de alertas.
- Toast al detectar una alerta nueva (comparando con el estado anterior).

**Frontend — opcion B (SSE):**
- Endpoint `GET /api/{business}/notifications/stream` como Server-Sent Events.
- El frontend subscribe al stream y recibe alertas en tiempo real.
- Mas complejo pero sin latencia de polling.

Para MVP, polling cada 60 segundos es suficiente.

## Criterio de aceptacion

- Un badge o indicador aparece en la interfaz cuando hay alertas pendientes.
- Se muestra un toast o notificacion visible cuando hay un turno en 30 minutos.
- Se muestra alerta cuando una prenda lleva mas de 3 dias lista sin entregar.
- Las alertas se pueden descartar o marcan como leidas.

## Notas

- Las alertas deben ser por tenant — Damian no ve las de Ana y viceversa.
- Considerar persistir el estado "leido" por usuario en la DB o en localStorage.
- El intervalo de polling (60s) y los umbrales (30min, 3 dias) deben ser faciles de configurar.
- En el futuro: conectar con el sistema de WhatsApp para enviar la misma alerta por mensaje.
