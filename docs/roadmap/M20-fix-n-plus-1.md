# M20: Fix N+1 Queries en stale-patients y patients

## Problematica
`GET /dashboard/stale-patients` (damian.ts:276-299) itera sobre TODOS los clientes y hace 1 query por cada uno (loop secuencial). `GET /patients` (damian.ts:303-324) hace 2 queries por cliente en paralelo (Promise.all). Con 100 clientes son 100+ o 200 queries.

## Contexto
Ambos endpoints necesitan saber cuántos PatientRecords tiene cada cliente y cuándo fue el último. Actualmente hacen N queries individuales.

## Implementacion propuesta
1. Para stale-patients: usar `prisma.$queryRaw` con subquery que hace JOIN + GROUP BY en una sola query
2. O usar `prisma.patientRecord.groupBy({ by: ['clientId'], _count: true, _max: { date: true } })` si Prisma lo soporta con el schema actual
3. Para patients: similar approach con groupBy o raw query
4. Alternativa: agregar `_count` relation en el schema de Prisma entre Client y PatientRecord

## Criterio de aceptacion
- stale-patients: máximo 2-3 queries independientemente de la cantidad de clientes
- patients: máximo 2-3 queries
- Tests existentes siguen pasando
- Nuevos tests verifican la query correcta

## Notas
Requiere que PatientRecord tenga un campo clientId que sea FK a Client. Actualmente PatientRecord tiene `clientId` que referencia Client.id — verificar que la relación esté definida en schema.prisma.
