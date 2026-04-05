# M5: Busqueda Global

## Problematica

Cada seccion del sistema tiene su propio buscador aislado. Si el usuario quiere encontrar todo lo relacionado con "Maria" — la clienta, sus ordenes y sus citas — tiene que buscarla en tres lugares distintos. Esto fragmenta la experiencia y hace lento el flujo de trabajo diario.

## Contexto

La plataforma maneja entidades interrelacionadas: clientes, ordenes/fichas y citas. Una busqueda global unificada es una mejora de UX de alto impacto con costo de implementacion moderado. El patron de resultados agrupados por tipo ("Clientes", "Ordenes", "Citas") es familiar y escaneable.

## Implementacion propuesta

**Backend:**
- Endpoint `GET /api/{business}/search?q={query}` que busca en paralelo en:
  - Clientes: nombre, email, telefono.
  - Ordenes (Ana) o Fichas (Damian): descripcion, notas, numero de orden.
  - Citas: fecha, nombre del paciente/cliente asociado.
- Respuesta agrupada:
  ```json
  {
    "clients": [...],
    "orders": [...],
    "appointments": [...]
  }
  ```
- Limite de resultados por categoria (ej: top 5 por tipo) para mantener la respuesta rapida.
- Busqueda case-insensitive con `ILIKE` o equivalente en el ORM.

**Frontend:**
- Componente `GlobalSearchBar` en el topbar, siempre visible.
- Input con debounce (300ms) que dispara la query al backend.
- Dropdown de resultados agrupados por seccion: "Clientes", "Ordenes", "Citas".
- Click en un resultado navega directamente a la entidad (cliente, orden, cita).
- Estado de carga y estado vacio ("Sin resultados para 'X'").

## Criterio de aceptacion

- El buscador esta disponible desde cualquier pantalla de la plataforma.
- Buscar "Maria" devuelve: la clienta Maria, sus ordenes asociadas y sus citas.
- Los resultados estan agrupados por tipo y son clickeables.
- La busqueda responde en menos de 500ms para queries simples.

## Notas

- El endpoint debe respetar el tenant — un negocio no puede ver datos del otro.
- Para Damian, "ordenes" se mapean a fichas clinicas (`PatientRecord`).
- Si la busqueda se vuelve lenta con volumen, considerar indices en los campos buscados.
- Keyboard shortcut sugerido: `Cmd+K` / `Ctrl+K` para enfocar el buscador.
- Futuro: busqueda full-text con PostgreSQL `tsvector` para mayor precision.
