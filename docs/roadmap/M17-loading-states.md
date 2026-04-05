# M17: Loading State en Botones Submit

## Problematica
NINGÚN formulario en ninguno de los dos clientes tiene loading state en el botón submit. Un doble-click puede crear registros duplicados (clientes, citas, finanzas, órdenes).

## Contexto
Los handlers async (handleCreate, handleEdit, handleSubmit, etc.) no deshabilitan el botón durante la request. Solo 3 componentes tienen loading guards: Agent.tsx, ChatDemo.tsx, PhotoGallery.tsx.

## Implementacion propuesta
1. Agregar estado `isSubmitting` a cada componente con formularios
2. Deshabilitar botón submit con `disabled={isSubmitting}`
3. Opcionalmente mostrar spinner o texto "Guardando..."
4. Componentes afectados: Clients, Finances, Garments, Appointments, Patients, Dashboard (ambos)

## Criterio de aceptacion
- Todos los botones submit se deshabilitan durante la request
- Tests verifican que el botón tiene disabled=true durante submit
- No se pueden crear duplicados por doble-click

## Notas
Podría extraerse como un custom hook `useSubmit(fn)` que retorna `{ submit, isSubmitting }`.
