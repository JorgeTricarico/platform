# Z1: Dashboard Zenko — Widgets de prendas pendientes y proximas entregas

## Problematica
El dashboard de Zenko no muestra informacion accionable. Ana y Ariel necesitan ver de un vistazo cuantas prendas tienen pendientes y cuales entregar hoy/manana.

## Contexto
Existe un Dashboard basico. Los datos de garments (Order) ya estan en la DB con status y deliveryDate.

## Implementacion propuesta
1. Widget "Prendas pendientes" — count por status (recibido, en_proceso, listo)
2. Widget "Entregas proximas" — ordenes con deliveryDate en los proximos 3 dias
3. Widget "Entregas de hoy" — highlight con ordenes que vencen hoy
4. Endpoint GET /api/zenco/dashboard con stats agregadas

## Criterio de aceptacion
- Dashboard muestra counts por status
- Lista de entregas proximas visible
- Tests unitarios del endpoint de stats

## Notas
Reusar el patron de Dashboard de Damian si aplica.
