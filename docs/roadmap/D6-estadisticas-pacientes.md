# D6: Estadisticas de pacientes (frecuencia, motivos recurrentes)

## Problematica
Damian no tiene visibilidad de cuales son los motivos de consulta mas frecuentes, que pacientes vienen regularmente, o cuales dejaron de venir.

## Contexto
PatientRecord tiene reason, date, clientId. Los datos estan, falta la vista de analytics.

## Implementacion propuesta
1. Endpoint GET /api/damian/stats
2. Metricas: top motivos de consulta, pacientes por frecuencia, pacientes inactivos (>30 dias sin visita)
3. Vista en frontend con listados simples

## Criterio de aceptacion
- Endpoint devuelve metricas correctas
- Frontend muestra top motivos y pacientes inactivos
- Tests del endpoint

## Notas
Bajo costo de implementacion, alto valor para Damian. Priorizar post-D2.
