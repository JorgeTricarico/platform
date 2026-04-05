# M22: UUID en Todos los Modelos

## Problematica
Order, Appointment, ZencoFinance y DamianFinance generan IDs con `Date.now()-random` en application code (ej: `ORD-1712345678-42`). Bajo carga concurrente pueden colisionar. Es inconsistente con Client, PatientRecord, etc que usan `@default(uuid())`.

## Contexto
Los IDs se generan en las rutas (zenco.ts:49-51, damian.ts:49-51) antes de pasar a `prisma.create()`. El schema tiene `@id` pero no `@default(uuid())` en estos modelos.

## Implementacion propuesta
1. Actualizar schema.prisma: agregar `@default(uuid())` a Order, Appointment, ZencoFinance, DamianFinance
2. Eliminar la generación de IDs en las rutas (remover líneas que crean el id manualmente)
3. Crear migración SQL vía migrate.ts
4. Actualizar tests que mockean o verifican IDs con formato específico

## Criterio de aceptacion
- Todos los modelos usan UUID generado por la DB
- No hay generación de IDs en application code
- Migración aplicada sin perder datos existentes
- Tests actualizados

## Notas
Los IDs existentes (ORD-xxx, APT-xxx) seguirán funcionando como strings. Solo los nuevos registros usarán UUID. No es una migración destructiva.
