---
name: git-workflow-develop-main
description: "Workflow QA→prod via ramas develop y main, sin PRs. Push directo a develop, merge ff-only a main para promover."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0590326d-334a-4f0a-9176-0332b8152645
---

Workflow git: dos ramas, sin PRs.

- `develop` → auto-deploy ambiente QA en Render
- `main` → auto-deploy producción
- Push directo a `develop` para trabajo diario.
- Promover a prod: `git checkout main && git merge develop --ff-only && git push`.
- No crear ramas feature ni PRs.

**Why:** El usuario trabaja solo y prefiere velocidad (PRs son overhead). Pero el incidente de drift 2026-05-17 (migrations Prisma desincronizadas con prod) demostró que pushear directo a `main` sin un gate intermedio rompe al cliente real. La rama `develop` da ese gate sin agregar fricción de PRs. Decisión tomada en sesión 2026-05-17 al implementar M36 F1.

**How to apply:** Por defecto trabajar en `develop`, commit + push. Después de validar manualmente en URLs QA (`*-qa.onrender.com`), hacer merge ff-only a `main` y push. Si necesitás hotfix urgente en prod, podés saltarte QA committeando directo a `main`, pero es excepción no regla. Documentado en README.md sección "Workflow de deploys".

Relacionado: [[drift-incident-20260517]] (motivación), [[Render Infrastructure]] (service IDs), [[Prisma + Supabase Connection Guide]] (puertos pooler).
