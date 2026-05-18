# Platform Roadmap

> Este archivo es la fuente de verdad del roadmap. Se actualiza al final de cada sesion.
> Cada item DEBE tener un documento de referencia en `docs/roadmap/` que explique la problematica e implementacion.
> Ultima actualizacion: 2026-05-17 (sesion 29)

## Completado

| # | Item | Doc | Fecha |
|---|------|-----|-------|
| B1 | Migrar DB: clients + patient_records + intakeDate (port 5432) | [B1](docs/roadmap/B1-migracion-db.md) | 2026-04-05 |
| C1 | Completar test suite backend Damian (TDD) | [C1](docs/roadmap/C1-tests-damian.md) | 2026-04-05 |
| C5 | Redeploy en Render post-migracion | [C5](docs/roadmap/C5-redeploy-render.md) | 2026-04-05 |
| C8 | Vitest v4 migration — workspace→projects API, defineProject por cliente | [C8](docs/roadmap/C8-vitest-v4-migration.md) | 2026-04-07 |
| C9 | Fix 249 test failures — Prisma mocks faltantes, IDs desactualizados, upload path | [C9](docs/roadmap/C9-fix-test-failures.md) | 2026-04-07 |
| Z21 | Client search live feedback — "Buscando...", resultados, "No encontrados" | [Z21](docs/roadmap/Z21-client-search-live.md) | 2026-04-07 |
| Z14 | Filtro por status en tabla Garments (chips Todos/Recibido/En Proceso/Listo/Entregado) | — | 2026-04-07 |
| Z15 | Highlight visual filas vencidas en Garments (deliveryDate < hoy, status != entregado) | — | 2026-04-07 |
| Z9  | WhatsApp quick-send — botón "Avisar" con link wa.me pre-armado por prenda | — | 2026-04-07 |
| Z17 | config.ts para Zenko — centralizar repairTypes, businessName, currency, statuses, whatsappReadyMsg | — | 2026-04-07 |
| D22 | DELETE /appointments/:id + botón eliminar cita en UI | [D22](docs/roadmap/D22-delete-appointments.md) | 2026-04-07 |
| Z22 | Botón "Avisar" solo visible cuando status === 'listo' (era visible en todas las prendas) | — | 2026-04-07 |
| D28 | Filtro por fecha en Appointments: chips Todos/Hoy/Esta semana/Este mes | — | 2026-04-07 |
| Z18b | Historial de órdenes por cliente en Clients Zenko (botón → modal con tabla + stats) | — | 2026-04-07 |
| Z26 | orderNumber autoincremental — formato ORD-001 en vez de UUID truncado | — | 2026-04-11 |
| Z27 | Filtros avanzados Garments — tipo arreglo, fechas, vencidos, sort múltiple | — | 2026-04-11 |
| M28 | Tailwind v4 + shadcn/ui — migración completa de todas las páginas y componentes | — | 2026-04-11 |
| M29 | Mobile responsive total — cards en mobile, tablas en desktop (Garments, Clients, Dashboard) | — | 2026-04-11 |
| M30 | Hash-based routing — refresh y botón atrás mantienen la página activa | — | 2026-04-11 |
| M31 | Code split generateTicket — bundle Garments 666KB → 15KB (jsPDF/QR lazy) | — | 2026-04-11 |
| M32 | CSS purge — 1766 → 258 líneas (-85%), eliminación de CSS legacy | — | 2026-04-11 |
| M33 | JWT auto-refresh — endpoint /api/auth/refresh + timer frontend 5min antes de expirar | — | 2026-04-11 |
| M34 | Dynamic BusinessConfig — VITE_BUSINESS env var, BUSINESS_REGISTRY tipado, nuevo cliente = solo config | — | 2026-04-11 |

---

## Plataforma (compartido)

Mejoras que aplican a ambos clientes o al backend general.

| # | Item | Doc | Estado | Prioridad |
|---|------|-----|--------|-----------|
| C2 | Agregar zod validation a todos los endpoints | [C2](docs/roadmap/C2-zod-validation.md) | **completado** | alta |
| C3 | Mejorar error handling: log real + details en dev | [C3](docs/roadmap/C3-error-handling.md) | **completado** | alta |
| C4 | CI basico: GitHub Action que corra vitest en cada push | [C4](docs/roadmap/C4-ci-github-actions.md) | **completado** | media |
| M2 | Historial de chat persistente en DB | [M2](docs/roadmap/M2-chat-history-persistente.md) | **completado** | media |
| M4 | Notificaciones in-app (turno proximo, prenda lista) | [M4](docs/roadmap/M4-notificaciones-inapp.md) | pendiente | baja |
| M5 | Busqueda global (clientes + ordenes + citas) | [M5](docs/roadmap/M5-busqueda-global.md) | pendiente | media |
| L1 | WhatsApp real con Baileys | [L1](docs/roadmap/L1-whatsapp-baileys.md) | **completado** | alta |
| L3 | Multi-tenant config-driven | [L3](docs/roadmap/L3-multi-tenant.md) | **completado** (BusinessConfig tipado + BUSINESS_REGISTRY + VITE_BUSINESS) | alta |
| L4 | Analytics dashboard (metricas de negocio) | [L4](docs/roadmap/L4-analytics-dashboard.md) | pendiente | media |
| L5 | Backup automatico DB a S3/GCS | [L5](docs/roadmap/L5-backup-automatico.md) | pendiente | media |
| L6 | PWA instalable en celular | [L6](docs/roadmap/L6-pwa.md) | **completado** (vite-plugin-pwa + manifest + SW + offline cache + mutation queue) | media |
| M7 | Tests E2E chatbot con API real (prompts + comportamiento) | [M7](docs/roadmap/M7-chatbot-e2e-tests.md) | **completado** | alta |
| C6 | Configurar MCP Supabase para migraciones directas | [C6](docs/roadmap/C6-mcp-supabase.md) | pendiente | media |
| C7 | Migration automatica via Supabase SQL | [C7](docs/roadmap/C7-migration-automatica.md) | **completado** | alta |
| M6 | Responsive completo — ambos clientes 100% usables en celular | [M6](docs/roadmap/M6-responsive-mobile.md) | **completado** (media queries + sidebar + modales min(X,90vw) + CSS consolidado) | alta |
| M8 | Fix: updateClient endpoint + Clients.tsx edit bug (crea duplicado) | — | **completado** (PUT /clients/:id + fix handleEdit) | **critica** |
| M9 | Toast system — reemplazar alert() con notificaciones styled | — | **completado** (ToastProvider + useToast, 16 alert→toast, success feedback) | alta |
| M10 | React Router — URLs reales, back/forward, deep linking | — | **completado** (hash-based routing #garments, #clients, etc.) | media |
| M11 | Auth basica (JWT) — proteger todos los endpoints | [M11](docs/roadmap/M11-auth-jwt.md) | **codigo completo** (backend + frontend + tests. Login por nombre, Bearer token, CORS restrictivo, AuthContext + Login UI, seed script. REQUIRE_AUTH env var controla demo mode. Pendiente infra: prisma db push, seed, Render env vars) | **critica** |
| M12 | CI frontend — agregar lint + tests de ambos clientes al CI | — | pendiente | alta |
| M13 | Object storage para fotos (S3/R2) — filesystem efimero en Render | — | pendiente | media |
| M14 | Cerrar modales con Escape + focus trap + aria-modal | — | **completado** (shadcn Dialog con ESC + overlay click) | media |
| M15 | Paginacion en endpoints y tablas (garments, clients, appointments) | — | pendiente | media |
| M16 | Shared packages workspace — extraer db.ts, sync.ts, ToastContext, OfflineIndicator | [M16](docs/roadmap/M16-shared-packages.md) | pendiente | alta |
| M17 | Loading state en botones submit (evitar doble-click) | [M17](docs/roadmap/M17-loading-states.md) | **completado** (sesion 15) | alta |
| M18 | Eliminar console.error leftovers en 7 archivos frontend | — | pendiente | baja |
| M19 | Confirm modal custom — reemplazar window.confirm con modal styled | — | pendiente | media |
| M20 | Fix N+1 queries: stale-patients y patients (batch query) | [M20](docs/roadmap/M20-fix-n-plus-1.md) | **completado** (sesion 15) | **critica** |
| M21 | Status enum validation — zod enum para garment y appointment status | [M21](docs/roadmap/M21-status-enum.md) | pendiente | media |
| M22 | UUID en todos los modelos — reemplazar Date.now() IDs en Order/Appointment/Finance | [M22](docs/roadmap/M22-uuid-migration.md) | pendiente | alta |
| M23 | Cache TTL en cachedFetch — no servir datos stale indefinidamente | — | pendiente | media |
| M24 | Extraer helpers compartidos backend (getMonthRange, timeToMinutes) a utils/ | — | pendiente | baja |
| M25 | Gemini API key — renovar free tier o habilitar billing | [M25](docs/roadmap/M25-gemini-key.md) | pendiente | alta |
| M26 | Localización completa en español — validaciones, fechas y mensajes de navegador | — | pendiente | alta |
| M27 | Input de Fecha personalizado — resolver formato DD/MM/YYYY forzado en todos los navegadores | — | pendiente | media |
| M35 | ~~Refine framework~~ → **DESCARTADO** — no resuelve multi-instancia, agrega complejidad sin beneficio | [M35](docs/roadmap/M35-refine-framework.md) | **descartado** | — |
| M36 | Ambientes QA — separar dev/qa/prod con DBs independientes, preview deployments | [M36](docs/roadmap/M36-ambientes-qa.md) | **F1 parcial** (rama `develop` + README workflow + script `init-qa-db.ts` listos; falta crear proyecto Supabase `platform-qa` + 3 servicios Render `*-qa` apuntando a develop) | **critica** |
| M37 | DataView component reutilizable — tabla desktop / cards mobile, sort/filter/pagination built-in | [M37](docs/roadmap/M37-dataview-component.md) | pendiente | alta |
| M38 | Turborepo monorepo — extraer packages/ui, packages/types, packages/config, apps/backend, apps/web | [M38](docs/roadmap/M38-template-cliente.md) | pendiente | **critica** |
| M39 | Coolify + Docker — deploy aislado por cliente, VPS Hetzner, SSL automático | [INFRA](docs/integrations/INFRA-DOCKER-POR-CLIENTE.md) | pendiente | **critica** |
| M40 | Tenant config system — tenants/{name}/config.ts + features.ts + prompts.ts por cliente | [SAAS](docs/integrations/SAAS-ARCHITECTURE-EVALUATION.md) | pendiente | **critica** |
| M41 | Paginación server-side — cursor-based pagination en endpoints + componente Pagination | — | pendiente | media |
| M42 | Onboarding automatizado — script create-tenant + deploy via Coolify API | — | pendiente | alta |
| M43 | Alertas internas staff — generadores reales para `audience='staff'` (orden vencida, cliente respondio WhatsApp) | [M43](docs/roadmap/M43-alertas-staff.md) | pendiente | alta |
| M44 | Prisma migrate formal para `Notification.audience` — hoy aplicado via `db push`, falta archivo de migration versionado | [M44](docs/roadmap/M44-prisma-migrate-formal.md) | **completado** (sesion 2026-05-17: migration `20260517_add_notification_audience` + 2 resolves para sincronizar `_prisma_migrations` con DB) | baja |

---

## Zenko (Ana & Ariel — arreglos de ropa)

| # | Item | Doc | Estado | Prioridad |
|---|------|-----|--------|-----------|
| Z1 | Dashboard Zenko: prendas pendientes + proximas entregas | [Z1](docs/roadmap/Z1-dashboard-zenko-widgets.md) | **completado** | alta |
| Z2 | Notificacion "prenda lista" al cliente (in-app/WhatsApp) | [Z2](docs/roadmap/Z2-notificacion-prenda-lista.md) | **completado** | media |
| Z3 | Historial de ordenes por cliente (vista consolidada) | [Z3](docs/roadmap/Z3-historial-ordenes-cliente.md) | **completado** | media |
| Z4 | Fotos de prendas (upload al recibir) | [Z4](docs/roadmap/Z4-fotos-prendas.md) | **completado** | baja |
| Z5 | Reporte semanal/mensual de arreglos y facturacion | [Z5](docs/roadmap/Z5-reporte-zenko.md) | **completado** | media |
| Z6 | Frontend notificaciones (badge + panel en sidebar) | [Z6](docs/roadmap/Z6-frontend-notificaciones.md) | **completado** | media |
| Z7 | Conectar notificacion prenda lista con WhatsApp | [Z7](docs/roadmap/Z7-whatsapp-prenda-lista.md) | **completado** | alta |
| Z8 | Galeria de fotos en vista detalle de orden | [Z8](docs/roadmap/Z8-galeria-fotos-orden.md) | **completado** | media |
| Z9 | WhatsApp quick-send — botón "Avisar" con link wa.me pre-armado por prenda | — | **completado** (botón verde en tabla, mensaje usa config.ts) | alta |
| Z10 | Workflow "Entregar" — auto-crear ingreso financiero al marcar entregado | — | **completado** | media |
| Z11 | Tracking sena/saldo por orden (depositAmount, paid, balance) | — | **completado** (Ticket PDF + UI balance) | media |
| Z12 | Export CSV/PDF mensual de ordenes y finanzas | — | pendiente | baja |
| Z13 | Ranking de tipos de arreglo (chart en Dashboard) | — | pendiente | baja |
| Z14 | Filtro por status en tabla Garments | — | **completado** (chips Todos/Recibido/En Proceso/Listo/Entregado con contadores) | media |
| Z15 | Highlight visual filas vencidas en Garments (deliveryDate < hoy) | — | **completado** (badge "Vencido" rojo en columna Estado) | media |
| Z16 | Editar/eliminar registros financieros | — | **completado** (PUT+DELETE /finances/:id + UI edit/delete) | media |
| Z17 | config.ts para Zenko — centralizar repairTypes, businessName, currency, whatsappReadyMsg | — | **completado** (clients/zenko/src/config.ts, GarmentModal importa desde config) | alta |
| Z18 | Mostrar deliveryDate e intakeDate en tabla Garments | — | **completado** (Columnas Ingreso y Entrega añadidas) | media |
| Z19 | Revenue widget en Dashboard (income/expense cards del reports/summary) | — | pendiente | media |
| Z20 | DELETE /clients/:id endpoint + botón eliminar cliente | — | **completado** (UI botón rojo + confirmación) | media |
| Z22 | Botón "Avisar" solo visible/destacado cuando status === 'listo' | — | **completado** (condicional `g.status === 'listo'` en Garments.tsx) | media |
| Z23 | QR Ticket — direccionar a fecha de entrega | — | **completado** (QR contiene ID y Fecha de Entrega) | media |
| Z24 | WhatsApp Template — mensaje formal multiline con horarios | — | **completado** (Avisar usa nuevo template) | alta |
| Z25 | Quitar "Ubicación" de Gestión de Prendas | — | **completado** (Ubicación removida de tabla y modal) | baja |
| Z28 | QR Scanner — layout full viewport sin scroll (camara dominante + paneles laterales en desktop) | [Z28](docs/roadmap/Z28-qr-layout-sin-scroll.md) | **completado** (split desktop + flex mobile, App.tsx padding condicional) | alta |
| Z29 | QR Scanner — Modo Mostrador con auto-start camara + auto-accion configurable (WhatsApp / print) | [Z29](docs/roadmap/Z29-qr-modo-mostrador.md) | pendiente | media |
| Z30 | QR Scanner — Historial de escaneos en sesion + deshacer ultimo cambio de status | [Z30](docs/roadmap/Z30-qr-historial-undo.md) | **completado** (historial max 10, undo dentro de 60s, contador visual) | media |
| Z31 | QR Scanner — Modo bulk (toast + beep sin modal), cobro al entregar con metodo de pago, atajos teclado 1/2/3 | [Z31](docs/roadmap/Z31-qr-bulk-cobro-atajos.md) | pendiente | media |
| Z32 | QR Scanner — Guard doble-scan (alert "Ya estaba en X") + Panel "Avisar por WhatsApp" lateral + Mensaje WhatsApp adaptativo largo/breve por cantidad de entregas previas + nombre prenda destacado en `*«»*` | — | **completado** (sesion 2026-05-18: backend `unchanged` response, helper `buildZencoReadyMsg` compartido, `previousDeliveries` en response, panel verde lateral en QRScanner, +16 tests) | alta |
| Z33 | Garments.tsx — fetch `previousDeliveries` por orden para usar mensaje WhatsApp adaptativo (hoy default `mode: 'long'`) — agrega endpoint `GET /api/zenco/clients/by-phone/:phone/delivery-count` o incluir count en `GET /garments` | — | pendiente | baja |

---

## Damian (masajista — turnos y fichas clinicas)

| # | Item | Doc | Estado | Prioridad |
|---|------|-----|--------|-----------|
| D1 | Ficha clinica enriquecida (peso, altura, presion, alergias) | [D1](docs/roadmap/D1-ficha-clinica-enriquecida.md) | pendiente | media |
| D2 | Dashboard Damian: proximos turnos + pacientes sin ficha | [D2](docs/roadmap/D2-dashboard-damian-widgets.md) | **backend completo** | media |
| D3 | Export PDF de historia clinica | [D3](docs/roadmap/D3-export-pdf-fichas.md) | **completado** | media |
| D4 | Google Calendar sync (turnos automaticos) | [D4](docs/roadmap/D4-google-calendar.md) | pendiente | media |
| D5 | Recordatorio de turno al cliente (24h antes) | [D5](docs/roadmap/D5-recordatorio-turno.md) | pendiente | media |
| D6 | Estadisticas de pacientes (frecuencia, motivos recurrentes) | [D6](docs/roadmap/D6-estadisticas-pacientes.md) | pendiente | baja |
| D7 | Frontend dashboard Damian — widgets React para los 3 endpoints | [D7](docs/roadmap/D7-frontend-dashboard-damian.md) | **completado** | alta |
| D8 | Integracion musica+chat — procesar actions del agente en frontend | [D8](docs/roadmap/D8-musica-chat-frontend.md) | **completado** | media |
| D9 | Notificacion visual en sidebar cuando agente controla musica | [D9](docs/roadmap/D9-notificacion-musica-sidebar.md) | **completado** | baja |
| D10 | Shuffle mode para el player de musica ambiente | [D10](docs/roadmap/D10-shuffle-mode-player.md) | **completado** | baja |
| D11 | Vista de impresion optimizada para fichas (CSS @media print) | [D11](docs/roadmap/D11-vista-impresion-fichas.md) | pendiente | baja |
| D12 | Filtros en historial de paciente (fecha, motivo) | [D12](docs/roadmap/D12-filtros-historial-paciente.md) | pendiente | baja |
| D13 | Recurring appointments — programar cita semanal/quincenal automatica | — | pendiente | media |
| D14 | Campos intake medico: contraindicaciones, alergias, medicacion | — | pendiente | media |
| D15 | Escala de dolor 0-10 pre/post sesion en PatientRecord | — | pendiente | baja |
| D16 | Revenue breakdown por servicio (chart) | — | pendiente | baja |
| D17 | Razon de cancelacion al cambiar status de cita | — | pendiente | baja |
| D18 | Editar citas completas (fecha, hora, servicio, precio) | — | **completado** (PUT /appointments/:id + edit modal) | alta |
| D19 | Editar/eliminar registros financieros | — | **completado** (PUT+DELETE /finances/:id + UI edit/delete) | media |
| D20 | Deteccion de conflictos de horario en citas | — | **completado** (409 en POST+PUT, inline error en modal) | alta |
| D21 | Musica persiste al cambiar de pestaña | — | **completado** (display:none en vez de unmount) | alta |
| D22 | DELETE /appointments/:id + botón eliminar cita | [D22](docs/roadmap/D22-delete-appointments.md) | **completado** (endpoint + botón Eliminar rojo en UI) | alta |
| D23 | Editar fichas clínicas desde Patients.tsx (PUT ya existe en backend) | — | pendiente | media |
| D24 | Filtro "Próximas" vs "Historial" en Appointments.tsx | — | pendiente | media |
| D25 | Revenue widget en Dashboard (resumen financiero mensual) | — | pendiente | media |
| D26 | DELETE /clients/:id endpoint + botón eliminar cliente | — | pendiente | media |
| D27 | Tests faltantes: Dashboard, Patients, Agent, Ambient, widgets | [D27](docs/roadmap/D27-tests-faltantes.md) | pendiente | alta |
| D28 | Filtro por fecha/mes en lista de citas (hoy / esta semana / mes) | — | **completado** (chips Todos/Hoy/Esta semana/Este mes en Appointments.tsx) | media |
| D29 | WhatsApp Damian — replicar lógica largo/breve por entregas previas + nombre servicio en `*«»*` (mismo patrón que Zenko Z32) | — | pendiente | baja |

---

## Mejoras del agente/skills

| # | Item | Doc | Estado | Prioridad |
|---|------|-----|--------|-----------|
| A1 | TDD como gate obligatorio (no completar sin tests) | [A1](docs/roadmap/A1-tdd-gate.md) | pendiente | alta |
| A2 | Pre-flight check antes de push | [A2](docs/roadmap/A2-preflight-check.md) | pendiente | alta |
| A3 | Migration detector (schema changes sin db push) | [A3](docs/roadmap/A3-migration-detector.md) | pendiente | alta |
| A4 | Retry con diagnostico (curl antes de buscar en codigo) | [A4](docs/roadmap/A4-retry-diagnostico.md) | pendiente | baja |
| A5 | Testing automatizado post-implementacion | [A5](docs/roadmap/A5-testing-automatizado.md) | pendiente | media |
| A6 | TDD enforcement via Claude Code hooks + CLAUDE.md rules | [A6](docs/roadmap/A6-tdd-enforcement-hooks.md) | **en progreso** | **critica** |

---

## Como agregar items

1. Agregar fila a la tabla del cliente correspondiente con el proximo numero (ej: Z6, D7, A6)
2. Crear documento `docs/roadmap/{ID}-{slug}.md` con el template de abajo
3. Commitear ambos cambios juntos

### Template para docs/roadmap/

```markdown
# {ID}: {Titulo}

## Problematica
Que problema resuelve y por que es necesario.

## Contexto
Situacion actual, que existe hoy, que falta.

## Implementacion propuesta
Pasos concretos, archivos a tocar, dependencias.

## Criterio de aceptacion
Como sabemos que esta terminado. Tests requeridos.

## Notas
Riesgos, alternativas consideradas, decisiones.
```
