# D12: Filtros en Historial de Paciente

## Problematica
Cuando un paciente tiene muchas fichas clinicas, encontrar una sesion especifica requiere scroll manual. Filtros por fecha y motivo permiten encontrar rapidamente lo que se busca.

## Contexto
- Patients.tsx muestra todas las fichas ordenadas por fecha descendente
- No hay forma de filtrar por rango de fechas ni por motivo de consulta
- Con pacientes frecuentes (semanal), el historial crece rapido

## Implementacion propuesta
- Agregar barra de filtros encima del listado de fichas:
  - Input de texto para buscar por motivo/tratamiento/observaciones
  - Date range picker (desde/hasta) para filtrar por periodo
- Filtrado client-side sobre los records ya cargados (no requiere endpoint nuevo)
- Mostrar contador de resultados ("5 de 23 fichas")

## Criterio de aceptacion
- Filtro de texto busca en reason, treatment, observations y areas
- Filtro de fecha filtra por rango inclusivo
- Se pueden combinar ambos filtros
- Contador visible de resultados filtrados vs totales
- Sin filtros, se ve todo como antes

## Notas
- 100% frontend, sin cambios de backend
- Considerar debounce en el input de texto para no re-renderizar en cada tecla
