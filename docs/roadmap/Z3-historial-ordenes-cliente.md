# Z3: Historial de ordenes por cliente

## Problematica
No hay forma de ver todas las ordenes de un cliente consolidadas. Ana necesita saber si un cliente es recurrente y que arreglos le hizo antes.

## Contexto
Las ordenes tienen clientPhone pero no hay vista por cliente. El modelo Client existe con phone+business unique.

## Implementacion propuesta
1. Endpoint GET /api/zenco/clients/:id/orders — ordenes filtradas por clientPhone
2. Vista en frontend: al clickear un cliente, ver su historial de ordenes
3. Badge de "cliente recurrente" si tiene >3 ordenes

## Criterio de aceptacion
- Endpoint devuelve ordenes filtradas por cliente
- Frontend muestra historial al clickear cliente
- Tests del endpoint

## Notas
Relacion es por clientPhone (no FK), asi que buscar por phone del Client.
