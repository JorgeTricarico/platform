# C9: Fix 249 Test Failures — Mocks, IDs, Paths

## Problematica
249 tests fallando por multiples causas acumuladas entre sesiones 15-16.

## Contexto
3 categorias de fallas:
1. **Prisma mocks incompletos** (12 tests) — routes agregaron `findFirst`, `groupBy`, `findUnique` sin actualizar mock en setup.ts
2. **IDs desactualizados** (3 tests) — integration tests esperaban `ORD-xxx` pero el codigo ahora genera `0001` (sequential)
3. **Upload path** (1 test) — `path.resolve('uploads')` depende de cwd, falla cuando vitest corre desde root del workspace

## Implementacion
1. Agregar `order.findFirst`, `patientRecord.groupBy`, `appointment.findUnique` al mock en `setup.ts`
2. Actualizar `garment-integration.test.ts`: IDs `ORD-xxx` → `0001` formato sequential
3. Actualizar `damian.test.ts`: mock `patientRecord.groupBy` en vez de `count` para totalRecords
4. Fix `garment-photos.ts`: usar `import.meta.url` para resolver path de uploads

## Criterio de aceptacion
- 310/310 tests passing
- Tests corren correctamente tanto desde root como desde cada proyecto individual

## Notas
- Root cause: features se commitean sin actualizar tests dependientes
- Prevencion: A1 (TDD gate) y A6 (TDD enforcement hooks)
