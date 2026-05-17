# M44: Migracion Prisma formal para Notification.audience

## Problematica
El campo `Notification.audience` se agrego al schema y se aplico en prod via `prisma db push` (sin generar archivo de migration versionado). Esto funciona pero deja deuda:
- No hay un archivo `migrations/<timestamp>_add_audience/migration.sql` reproducible.
- Si alguien reinicia la DB desde cero (recovery), Prisma no sabe que ese cambio existio.
- Otros entornos (dev local de un nuevo dev, CI) tendrian que correr `db push` en vez de `migrate deploy`.

## Contexto
- Hoy se aplico via Render deploy: `prisma db push` lee `schema.prisma` y aplica diff.
- `backend/scripts/backfill-notification-audience.ts` cubre el caso de filas pre-existentes.
- El proyecto no usa `prisma migrate` por convencion: ver `reference_prisma_supabase.md` — el pooler de Supabase tiene timeouts cortos que pueden romper migrate.

## Implementacion propuesta
Cuando se pueda parar la DB unos minutos (ventana de mantenimiento):

1. Conectar al pooler directo (port 5432, no el shared 6543) — ver `reference_prisma_supabase.md`.
2. Correr `npx prisma migrate dev --name add_notification_audience --create-only` — genera SQL sin aplicar.
3. Revisar el SQL: deberia ser solo `ALTER TABLE "notifications" ADD COLUMN "audience" TEXT NOT NULL DEFAULT 'client';` + `CREATE INDEX`.
4. Como la columna ya existe en prod, `migrate deploy` va a fallar — solucion:
   - Opcion A: `INSERT INTO _prisma_migrations` con la firma del SQL para marcarlo como aplicado.
   - Opcion B: hacer un baseline desde cero con `prisma migrate resolve --applied`.
5. Verificar que `prisma migrate status` queda limpio en todos los entornos.

## Criterio de aceptacion
- Existe carpeta `backend/prisma/migrations/<timestamp>_add_notification_audience/`.
- `prisma migrate status` en prod y dev devuelve "Database schema is up to date".
- Nuevo dev puede correr `prisma migrate deploy` desde cero y obtener el mismo schema.

## Notas
- Baja prioridad funcional (no rompe nada), media tecnica (debt acumulativa).
- Si se decide adoptar migrate de forma definitiva, conviene baselinear TODAS las migraciones previas que se aplicaron via db push (no solo esta).
- Alternativa pragmatica: documentar en CLAUDE.md que el proyecto usa db push deliberadamente y nunca generar migrations.
