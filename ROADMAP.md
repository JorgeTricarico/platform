# Platform Roadmap

> Este archivo es la fuente de verdad del roadmap. Se actualiza al final de cada sesion.
> Cada item DEBE tener un documento de referencia en `docs/roadmap/` que explique la problematica e implementacion.
> Ultima actualizacion: 2026-04-05 (sesion 4)

## Completado

| # | Item | Doc | Fecha |
|---|------|-----|-------|
| B1 | Migrar DB: clients + patient_records + intakeDate (port 5432) | [B1](docs/roadmap/B1-migracion-db.md) | 2026-04-05 |
| C1 | Completar test suite backend Damian (TDD) | [C1](docs/roadmap/C1-tests-damian.md) | 2026-04-05 |
| C5 | Redeploy en Render post-migracion | [C5](docs/roadmap/C5-redeploy-render.md) | 2026-04-05 |

---

## Plataforma (compartido)

Mejoras que aplican a ambos clientes o al backend general.

| # | Item | Doc | Estado | Prioridad |
|---|------|-----|--------|-----------|
| C2 | Agregar zod validation a todos los endpoints | [C2](docs/roadmap/C2-zod-validation.md) | **completado** | alta |
| C3 | Mejorar error handling: log real + details en dev | [C3](docs/roadmap/C3-error-handling.md) | pendiente | alta |
| C4 | CI basico: GitHub Action que corra vitest en cada push | [C4](docs/roadmap/C4-ci-github-actions.md) | pendiente | media |
| M2 | Historial de chat persistente en DB | [M2](docs/roadmap/M2-chat-history-persistente.md) | pendiente | media |
| M4 | Notificaciones in-app (turno proximo, prenda lista) | [M4](docs/roadmap/M4-notificaciones-inapp.md) | pendiente | baja |
| M5 | Busqueda global (clientes + ordenes + citas) | [M5](docs/roadmap/M5-busqueda-global.md) | pendiente | media |
| L1 | WhatsApp real con Baileys | [L1](docs/roadmap/L1-whatsapp-baileys.md) | pendiente | alta |
| L3 | Multi-tenant config-driven | [L3](docs/roadmap/L3-multi-tenant.md) | pendiente | baja |
| L4 | Analytics dashboard (metricas de negocio) | [L4](docs/roadmap/L4-analytics-dashboard.md) | pendiente | media |
| L5 | Backup automatico DB a S3/GCS | [L5](docs/roadmap/L5-backup-automatico.md) | pendiente | media |
| L6 | PWA instalable en celular | [L6](docs/roadmap/L6-pwa.md) | pendiente | media |
| C6 | Configurar MCP Supabase para migraciones directas | [C6](docs/roadmap/C6-mcp-supabase.md) | pendiente | media |

---

## Zenko (Ana & Ariel — arreglos de ropa)

| # | Item | Doc | Estado | Prioridad |
|---|------|-----|--------|-----------|
| Z1 | Dashboard Zenko: prendas pendientes + proximas entregas | [Z1](docs/roadmap/Z1-dashboard-zenko-widgets.md) | **completado** | alta |
| Z2 | Notificacion "prenda lista" al cliente (in-app/WhatsApp) | [Z2](docs/roadmap/Z2-notificacion-prenda-lista.md) | pendiente | media |
| Z3 | Historial de ordenes por cliente (vista consolidada) | [Z3](docs/roadmap/Z3-historial-ordenes-cliente.md) | pendiente | media |
| Z4 | Fotos de prendas (upload al recibir) | [Z4](docs/roadmap/Z4-fotos-prendas.md) | pendiente | baja |
| Z5 | Reporte semanal/mensual de arreglos y facturacion | [Z5](docs/roadmap/Z5-reporte-zenko.md) | pendiente | media |

---

## Damian (masajista — turnos y fichas clinicas)

| # | Item | Doc | Estado | Prioridad |
|---|------|-----|--------|-----------|
| D1 | Ficha clinica enriquecida (peso, altura, presion, alergias) | [D1](docs/roadmap/D1-ficha-clinica-enriquecida.md) | pendiente | media |
| D2 | Dashboard Damian: proximos turnos + pacientes sin ficha | [D2](docs/roadmap/D2-dashboard-damian-widgets.md) | **backend completo** | media |
| D3 | Export PDF de historia clinica | [D3](docs/roadmap/D3-export-pdf-fichas.md) | pendiente | media |
| D4 | Google Calendar sync (turnos automaticos) | [D4](docs/roadmap/D4-google-calendar.md) | pendiente | media |
| D5 | Recordatorio de turno al cliente (24h antes) | [D5](docs/roadmap/D5-recordatorio-turno.md) | pendiente | media |
| D6 | Estadisticas de pacientes (frecuencia, motivos recurrentes) | [D6](docs/roadmap/D6-estadisticas-pacientes.md) | pendiente | baja |
| D7 | Frontend dashboard Damian — widgets React para los 3 endpoints | [D7](docs/roadmap/D7-frontend-dashboard-damian.md) | **completado** | alta |
| D8 | Integracion musica+chat — procesar actions del agente en frontend | [D8](docs/roadmap/D8-musica-chat-frontend.md) | **completado** | media |
| D9 | Notificacion visual en sidebar cuando agente controla musica | [D9](docs/roadmap/D9-notificacion-musica-sidebar.md) | pendiente | baja |
| D10 | Shuffle mode para el player de musica ambiente | [D10](docs/roadmap/D10-shuffle-mode-player.md) | pendiente | baja |

---

## Mejoras del agente/skills

| # | Item | Doc | Estado | Prioridad |
|---|------|-----|--------|-----------|
| A1 | TDD como gate obligatorio (no completar sin tests) | [A1](docs/roadmap/A1-tdd-gate.md) | pendiente | alta |
| A2 | Pre-flight check antes de push | [A2](docs/roadmap/A2-preflight-check.md) | pendiente | alta |
| A3 | Migration detector (schema changes sin db push) | [A3](docs/roadmap/A3-migration-detector.md) | pendiente | alta |
| A4 | Retry con diagnostico (curl antes de buscar en codigo) | [A4](docs/roadmap/A4-retry-diagnostico.md) | pendiente | baja |
| A5 | Testing automatizado post-implementacion | [A5](docs/roadmap/A5-testing-automatizado.md) | pendiente | media |

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
