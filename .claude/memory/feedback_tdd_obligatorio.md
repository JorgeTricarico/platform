---
name: TDD Obligatorio
description: Tests ANTES que codigo — RED→GREEN→VERIFY obligatorio, mocks completos, suite completa antes de commit, 3 capas de enforcement
type: feedback
---

Tests SIEMPRE antes que implementacion. Secuencia obligatoria: RED (test que falla) → GREEN (codigo minimo) → VERIFY (vitest run completo).

**Why:** Sesion 17 revelo 249 tests rotos porque features se commitearon sin actualizar tests. Mocks de Prisma incompletos (faltaban findFirst, groupBy), IDs desactualizados. El usuario fue explicito: TDD es obligatorio, no opcional.

**How to apply:**
- Para CUALQUIER cambio en routes/, pages/, components/: escribir test primero
- Si se agrega metodo Prisma nuevo en route: agregar al mock en backend/src/__tests__/setup.ts
- Correr `npx vitest run` COMPLETO antes de commit (no solo archivos afectados)
- 3 capas de enforcement implementadas:
  1. CLAUDE.md — seccion "TDD Obligatorio" con reglas explicitas
  2. Claude Code hooks — PreToolUse warning si se edita produccion sin test previo
  3. Pre-commit hook — bloquea commit si vitest falla
- Todo CRUD debe tener tests unitarios (mock Prisma) Y de integracion (supertest)
