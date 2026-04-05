# B1: Migracion DB

## Problematica

Supabase pooler (port 6543) no soporta DDL. `prisma db push` cuelga indefinidamente cuando se usa la URL del pooler.

## Contexto

Las tablas `clients`, `patient_records` y la columna `intakeDate` no existen en la base de datos. El schema de Prisma esta definido pero nunca se aplico correctamente porque la URL de conexion apunta al pooler en lugar de la conexion directa.

## Implementacion propuesta

1. Ir a Supabase Dashboard > Settings > Database
2. Copiar la URL de conexion directa (port 5432, no el pooler en 6543)
3. Ejecutar la migracion con la URL directa:

```bash
DATABASE_URL="postgresql://..." npx prisma db push
```

4. Verificar que las tablas fueron creadas correctamente en Supabase Table Editor

## Criterio de aceptacion

- `prisma db push` completa sin errores ni timeouts
- Las tablas `clients` y `patient_records` existen en la DB
- La columna `intakeDate` existe en `patient_records`

## Notas

- La variable `DATABASE_URL` en `.env` puede seguir apuntando al pooler para queries en runtime (PgBouncer es compatible con DML)
- Solo para migraciones/DDL se necesita la URL directa port 5432
- En Render, si se necesita re-migrar, hacerlo desde la CLI local con la URL directa
