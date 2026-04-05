# M21: Status Enum Validation

## Problematica
`updateStatusSchema` (schemas.ts:21) acepta cualquier string como status. No hay validación de que el status sea uno de los valores válidos. Se puede escribir `status: "eliminado"` o cualquier string arbitrario a la DB.

## Contexto
Garments usan: recibido, en_proceso, listo, entregado. Appointments usan: pendiente, confirmado, completado, cancelado. Ambos comparten el mismo schema `updateStatusSchema = z.object({ status: z.string().min(1) })`.

## Implementacion propuesta
1. Crear `garmentStatusSchema = z.enum(['recibido', 'en_proceso', 'listo', 'entregado'])`
2. Crear `appointmentStatusSchema = z.enum(['pendiente', 'confirmado', 'completado', 'cancelado'])`
3. Separar en dos schemas distintos: `updateGarmentStatusSchema` y `updateAppointmentStatusSchema`
4. Actualizar las rutas para usar el schema correspondiente
5. Agregar tests que verifiquen rechazo de status inválido

## Criterio de aceptacion
- PUT /garments/:id/status rechaza status no válido con 400
- PUT /appointments/:id/status rechaza status no válido con 400
- Tests cubren tanto status válidos como inválidos

## Notas
Considerar si agregar el enum también al Prisma schema como restricción a nivel DB.
