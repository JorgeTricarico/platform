# Z5: Reporte semanal/mensual de arreglos y facturacion

## Problematica
Ana y Ariel no tienen visibilidad de cuanto facturaron en el mes, cuantos arreglos hicieron, o cual es su servicio mas pedido.

## Contexto
Los datos estan en Order (garments) y ZencoFinance. Falta una vista de reportes.

## Implementacion propuesta
1. Endpoint GET /api/zenco/reports?period=week|month
2. Retorna: total facturado, cantidad arreglos, top 5 tipos de arreglo, promedio por orden
3. Vista en frontend con graficos simples (bar chart con recharts o similar)

## Criterio de aceptacion
- Endpoint devuelve metricas correctas
- Frontend muestra al menos total facturado y cantidad de arreglos
- Tests del endpoint de reportes

## Notas
Mantener simple. No necesita graficos complejos para la primera version.
