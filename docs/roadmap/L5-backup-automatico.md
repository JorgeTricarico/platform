# L5: Backup Automatico de Base de Datos

## Problematica

Si Supabase falla, se corrompen datos o alguien borra algo accidentalmente, no hay mecanismo de recuperacion. Toda la informacion de los negocios podria perderse de forma irrecuperable.

## Contexto

La base de datos en Supabase contiene informacion critica: clientes, turnos, historial, configuracion de negocios. Supabase ofrece algunos backups en planes pagos, pero no hay control ni visibilidad sobre ellos desde la plataforma. Un backup propio da independencia y control total.

## Implementacion propuesta

- Implementar un cron job automatico que:
  - Corra `pg_dump` contra la DB de Supabase.
  - Comprima el dump (gzip).
  - Lo suba a un bucket de S3 o Google Cloud Storage.
  - Nombre el archivo con timestamp: `backup-YYYY-MM-DD.sql.gz`.
- Politica de retencion: conservar backups de los ultimos 30 dias, eliminar los mas antiguos automaticamente.
- El cron puede implementarse como:
  - GitHub Action con schedule (`cron: '0 3 * * *'` — 3am diario).
  - Render cron job si el backend ya corre en Render.
- Agregar notificacion por email o Slack si el backup falla.

## Criterio de aceptacion

- Se genera un backup automatico diario sin intervencion manual.
- El backup es verificable (se puede restaurar en un entorno de prueba).
- Los backups de mas de 30 dias se eliminan automaticamente.

## Notas

- La connection string de Supabase para pg_dump debe estar en variables de entorno (nunca hardcodeada).
- Verificar permisos del rol de DB para pg_dump (puede requerir rol con acceso de lectura total).
- Documentar el proceso de restauracion para que pueda ejecutarse en una emergencia.
