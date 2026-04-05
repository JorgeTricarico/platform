# C5: Redeploy en Render post-migracion

## Problematica

Despues de migrar la DB (ver B1), hay que hacer un rebuild completo en Render para que el backend use el schema actualizado. Sin esto, el Prisma Client generado en el ultimo deploy no conoce las nuevas tablas y columnas.

## Contexto

El build command de Render es:
```
npx prisma generate && npx tsc
```

`prisma generate` crea el Prisma Client a partir del schema. Si el schema cambio pero no se hizo un nuevo deploy, el cliente en produccion esta desactualizado y los queries a las nuevas tablas fallan.

## Implementacion propuesta

1. Completar la migracion de DB segun B1 (tablas `clients`, `patient_records`, columna `intakeDate`)

2. Hacer un deploy manual desde Render Dashboard:
   - Ir al servicio del backend de Damian en Render
   - Click en "Manual Deploy" > "Deploy latest commit"

3. Verificar en los logs de Render que el build completa exitosamente:
   - `prisma generate` sin errores
   - `tsc` sin errores de tipos

4. Verificar endpoints una vez deployado:
```bash
curl https://{servicio}.onrender.com/health
curl https://{servicio}.onrender.com/clients
curl https://{servicio}.onrender.com/patients/records
```

## Criterio de aceptacion

- El endpoint `/health` responde con status 200 y body `{ status: "ok" }` o equivalente
- El endpoint `/clients` responde sin errores de Prisma
- El endpoint `/patients/records` responde sin errores de Prisma
- Los logs de Render no muestran errores de "table does not exist" ni "column does not exist"

## Notas

- Este paso es dependiente de B1 — no tiene sentido redeplegar si la DB no fue migrada primero
- Si el redeploy falla por errores de tipos, resolver primero antes de re-intentar
- Render hace rebuild automatico en cada push a `main`, pero un Manual Deploy fuerza el proceso inmediatamente sin necesidad de un nuevo commit
