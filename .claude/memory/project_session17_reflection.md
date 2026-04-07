---
name: Session 17 Reflection
description: Vitest v4 migration (249→0 failures), missing Prisma mocks, live client search UX, test discipline gaps
type: project
---

## Session 17 — 2026-04-07

### Completed
- Migrated vitest workspace to v4 `projects` API (`defineProject` per client)
- Fixed 249 test failures (jsdom not loading in workspace context)
- Added 3 missing Prisma mock methods: `order.findFirst`, `patientRecord.groupBy`, `appointment.findUnique`
- Updated integration tests for sequential order IDs (`0001` instead of `ORD-xxx`)
- Fixed `garment-photos.ts` upload path (now uses `import.meta.url` instead of `path.resolve`)
- Enhanced client search UX: "Buscando...", live results, "No se encontraron clientes"

### Key Findings
- **Vitest v4 breaking changes**: `extends` + `test.root` workspace format no longer works. Need `defineProject` per client + `projects` array in root `vitest.config.ts`. The `--workspace` flag was removed.
- **Prisma mock drift**: Routes added new Prisma methods (`findFirst` for sequential IDs, `groupBy` for patient counts) without updating the test mock in `setup.ts`
- **Test discipline gap**: The sequential IDs feature was committed without updating integration tests that asserted `ORD-xxx` format

### Pending / Roadmap
- Consider auto-generating Prisma mocks from schema to prevent mock drift
- Always run full test suite before committing (not just affected files)
- 310/310 tests passing
