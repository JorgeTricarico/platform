# Platform Roadmap

> Este archivo es la fuente de verdad del roadmap. Se actualiza al final de cada sesion.
> Cada item DEBE tener un documento de referencia en `docs/roadmap/` que explique la problematica e implementacion.
> Ultima actualizacion: 2026-04-05

## Estado: BLOQUEANTE

| # | Item | Doc | Estado | Prioridad |
|---|------|-----|--------|-----------|
| B1 | Migrar DB: clients + patient_records + intakeDate (port 5432) | [B1](docs/roadmap/B1-migracion-db.md) | pendiente | critica |

## Corto plazo (proximas sesiones)

| # | Item | Doc | Estado | Prioridad |
|---|------|-----|--------|-----------|
| C1 | Completar test suite backend Damian (TDD) | [C1](docs/roadmap/C1-tests-damian.md) | pendiente | alta |
| C2 | Agregar zod validation a todos los endpoints | [C2](docs/roadmap/C2-zod-validation.md) | pendiente | alta |
| C3 | Mejorar error handling: log real + details en dev | [C3](docs/roadmap/C3-error-handling.md) | pendiente | alta |
| C4 | CI basico: GitHub Action que corra vitest en cada push | [C4](docs/roadmap/C4-ci-github-actions.md) | pendiente | media |
| C5 | Redeploy en Render post-migracion | [C5](docs/roadmap/C5-redeploy-render.md) | pendiente | alta |

## Medio plazo (1-2 semanas)

| # | Item | Doc | Estado | Prioridad |
|---|------|-----|--------|-----------|
| M1 | Ficha clinica enriquecida (peso, altura, presion, alergias) | [M1](docs/roadmap/M1-ficha-clinica-enriquecida.md) | pendiente | media |
| M2 | Historial de chat persistente en DB | [M2](docs/roadmap/M2-chat-history-persistente.md) | pendiente | media |
| M3 | Dashboard Damian: proximos turnos + pacientes sin ficha | [M3](docs/roadmap/M3-dashboard-damian-widgets.md) | pendiente | media |
| M4 | Notificaciones in-app (turno proximo, prenda lista) | [M4](docs/roadmap/M4-notificaciones-inapp.md) | pendiente | baja |
| M5 | Busqueda global (clientes + ordenes + citas) | [M5](docs/roadmap/M5-busqueda-global.md) | pendiente | media |
| M6 | Export PDF de historia clinica | [M6](docs/roadmap/M6-export-pdf-fichas.md) | pendiente | media |

## Largo plazo (post-demo)

| # | Item | Doc | Estado | Prioridad |
|---|------|-----|--------|-----------|
| L1 | WhatsApp real con Baileys | [L1](docs/roadmap/L1-whatsapp-baileys.md) | pendiente | alta |
| L2 | Google Calendar sync (Damian) | [L2](docs/roadmap/L2-google-calendar.md) | pendiente | media |
| L3 | Multi-tenant config-driven | [L3](docs/roadmap/L3-multi-tenant.md) | pendiente | baja |
| L4 | Analytics dashboard (metricas de negocio) | [L4](docs/roadmap/L4-analytics-dashboard.md) | pendiente | media |
| L5 | Backup automatico DB a S3/GCS | [L5](docs/roadmap/L5-backup-automatico.md) | pendiente | media |
| L6 | PWA instalable en celular | [L6](docs/roadmap/L6-pwa.md) | pendiente | media |

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

1. Agregar fila a la tabla correspondiente con el proximo numero (ej: C6, M7, L7)
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
