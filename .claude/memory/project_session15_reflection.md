---
name: session-15-reflection
description: Session 15 — bugs producción resueltos, auto-detect entorno, N+1 fix, loading states, features QR pendientes
type: project
---

## Session 15 (2026-04-06)

### Resuelto
- Auto-detect entorno (Render vs local) via config.ts — hostname-based
- API paths fijos: config.ts agrega /api/zenco o /api/damian si falta
- Calendario español (lang="es-AR"), UTC date fix (timeZone: 'UTC')
- N+1 queries eliminados en stale-patients (N+1→2q) y patients (2N+1→3q)
- Loading states en 12/12 submit buttons

### Pendiente critico
- Verificar post-deploy que rutas funcionen en producción
- Probar login completo en producción

### Features nuevas pedidas
- Foto al registrar prenda (no solo post-creación)
- Vista pública: cliente escanea QR y ve estado sin login
- Vista interna: escanear QR desde app para ver ubicación + detalles (con login)
- UI spacing: botones pegados a secciones

### Deuda técnica
- Prisma schema sin @relation (Client↔PatientRecord, Order↔GarmentPhoto) — impide `include`
- Damian Finances.tsx usa 1 submitting state para 2 forms (inconsistente con Zenko)
- UUID migration pendiente (M22)
