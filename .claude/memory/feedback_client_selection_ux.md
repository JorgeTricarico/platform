---
name: Client Selection UX Pattern
description: Al crear órdenes/entidades, permitir buscar cliente existente o crear nuevo inline, nunca forzar creación
type: feedback
---

Al crear una orden (o cualquier entidad que referencia a un cliente), NO forzar siempre la creación de un cliente nuevo.

**Why:** Jorge reporta que cada vez que agrega un arreglo tiene que crear el cliente desde cero. Clientes recurrentes no deberían re-crearse.

**How to apply:**
- Toggle o selector: "Cliente existente" vs "Nuevo cliente"
- Si existente: search rápido por nombre con autocomplete
- Si nuevo: formulario inline dentro del mismo form de orden
- Campo nombre = nombre + apellido (siempre)
- Homónimos: mostrar teléfono o email como diferenciador en resultados de búsqueda
- Aplicar este patrón a TODAS las funcionalidades donde se referencia una entidad que puede ya existir
