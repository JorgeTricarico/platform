# L4: Analytics Dashboard

## Problematica

No hay metricas de negocio disponibles en la app. Los duenos de negocio no pueden ver como evoluciona su actividad, cuales son sus servicios mas populares ni cuanto estan facturando.

## Contexto

Toda la informacion existe en la base de datos (appointments, clientes, servicios, pagos) pero no hay ninguna visualizacion. Tener metricas es clave para que los negocios tomen decisiones informadas y para que la plataforma demuestre valor tangible.

## Implementacion propuesta

- Agregar una pagina `/analytics` en el dashboard de cada negocio.
- Usar `recharts` para los graficos (ya popular en ecosistema React, liviano).
- Metricas a mostrar:
  - Ingresos por mes (suma de appointments completados)
  - Clientes nuevos por mes
  - Tasa de retorno de clientes (clientes con mas de 1 turno)
  - Servicios mas solicitados (top 5)
- Los datos se obtienen con queries a la DB existente via endpoints dedicados en el backend.
- Filtro de rango de fechas (por defecto: ultimo mes).

## Criterio de aceptacion

- La pagina de Analytics muestra graficos con datos reales del ultimo mes.
- Los numeros son consistentes con los registros en la base de datos.
- La pagina carga en menos de 3 segundos.

## Notas

- Crear endpoints de analytics con queries optimizadas (evitar N+1, usar agregaciones en SQL).
- Considerar cache de resultados si las queries son costosas (ej: cache de 1 hora).
- En una segunda fase: exportar a CSV, comparacion entre periodos.
