# A3: Migration Detector — Detectar Schema Drift

## Problematica

Se modifica `schema.prisma` pero no se corre `db push` o `migrate`. El backend compila sin errores pero falla en runtime cuando intenta acceder a columnas o tablas que no existen aun en la DB real.

## Contexto

Este tipo de error es particularmente traicionero: TypeScript y el build pasan correctamente porque Prisma genera tipos del schema local, no del estado real de la DB. El error solo aparece en runtime, potencialmente en produccion, cuando ya es tarde.

## Implementacion propuesta

- Agregar un check automatico que compare el estado de `schema.prisma` con el estado real de la DB.
- Usar `prisma migrate status` para detectar si hay migraciones pendientes.
- Integrar el check en:
  - El skill de preflight (A2) antes del push.
  - El startup del backend (warning en consola si hay drift al iniciar).
  - Como paso en el CI/CD pipeline.
- Si hay drift detectado, mostrar una alerta clara con instrucciones: "Hay cambios en schema.prisma sin aplicar. Correr: `npx prisma db push` o `npx prisma migrate dev`".

## Criterio de aceptacion

- Se muestra una alerta visible cuando `schema.prisma` tiene cambios que no estan aplicados en la DB.
- El backend loggea un warning al iniciar si detecta schema drift.
- El preflight check (A2) incluye la verificacion de migraciones pendientes.

## Notas

- `prisma migrate status` requiere acceso a la DB, asegurarse que la connection string este disponible en el contexto donde corre el check.
- Diferenciar entre "usando db push" (desarrollo) y "usando migrate" (produccion) — el detector debe funcionar en ambos flujos.
- Considerar agregar este check al script de desarrollo (`npm run dev`) para que el desarrollador lo vea inmediatamente.
