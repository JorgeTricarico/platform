# Z6: Frontend para notificaciones Zenko

## Problematica
Las notificaciones de Z2 existen en backend pero no hay UI para verlas. El cliente Ana no tiene forma visual de ver alertas de prendas listas.

## Contexto
Z2 implemento el backend completo: modelo Notification, auto-trigger al marcar prenda como lista, GET/PATCH endpoints. Falta el frontend React.

## Implementacion propuesta
1. Componente NotificationBell en el sidebar/header de Zenko
2. Badge con contador de no leidas
3. Panel dropdown con lista de notificaciones
4. Click para marcar como leida (PATCH al backend)
5. Integrar con el dashboard existente de Z1

## Criterio de aceptacion
- Badge muestra count de notificaciones no leidas
- Panel lista notificaciones ordenadas por fecha
- Click marca como leida y actualiza el count
- Test de componente con React Testing Library

## Notas
Depende de Z2 (completado). Considerar polling vs WebSocket para updates en tiempo real.
