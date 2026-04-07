---
name: zenko-damian-platform-status
description: Estado actual del proyecto Platform (Zenko + Damian) - funcionalidades implementadas, pendientes y bloqueantes
type: project
---

## Estado del proyecto Platform al 2026-04-05 (sesion 9)

### Arquitectura
- Monorepo: `/backend` (Express + Prisma + Supabase) + `/clients/zenko` + `/clients/damian` (React + Vite)
- Deploy: Render (backend: `platform-backend`, frontends: static sites)
- DB: Supabase PostgreSQL (pooler port 6543, direct port 5432 para migraciones)

### Testing
- 179 tests pasando (169 sesion 8 + 10 sesion 9)
- TDD obligatorio: tests ANTES de implementacion

### Zenko (Ana - arreglos ropa)
- Dashboard, CRUD garments/finances/clients + chatbot
- Z2: Notificaciones, Z3: Historial ordenes, Z4: Fotos prendas, Z5: Reportes
- Z7+Z6+Z8: WhatsApp notifications, status workflow, chatbot memory
- **Sesion 9**: Location field en Order, QR Ticket (jspdf+qrcode), filtro mes finanzas

### Damian (masajista)
- Dashboard con widgets, CRUD appointments/finances/clients/patients/records
- Agente IA con function calls + MusicContext + Ambient player
- D3: PDF export, D9: Music indicator, D10: Shuffle mode
- **Sesion 9**: Filtro mes finanzas, Dashboard refresh sin reload

### Plataforma
- C3: Error handling centralizado, C7: migrate.ts (mejorado: diff contra DB real)
- M2: Chat history persistente, M7: E2E tests chatbot
- **Sesion 9**: Responsive mobile (media queries 768px, sidebar hamburguesa), favicon+titles, App.css eliminado

### Migraciones DB PENDIENTES
- Campo `location` en Order (ALTER TABLE via `npx tsx scripts/migrate.ts --apply`)
- `prisma db push` NO funciona desde WSL — usar migrate.ts --apply

### Problemas conocidos
- Modales tienen width hardcodeado en inline styles (no responden a media queries)
- .github/workflows/ci.yml no pusheado (PAT necesita scope workflow)
- Gemini free tier puede estar agotado para E2E tests
- UI spacing: botón "Nueva Orden" pegado a sección "Prendas Pendientes", botón "Nuevo Cliente" pegado al div de abajo — falta margin/padding entre secciones
- Verificar post-deploy: que /clients y /notifications vayan a /api/zenco/* (config.ts auto-detect ya pusheado)
- Feature: foto al registrar prenda, ticket con QR, estado público para cliente (escanear QR), vista interna con ubicación y detalles
- Feature: desde la app-web/página escanear QR para ver más info (ubicación, detalles internos)
