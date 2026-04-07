# A6: TDD Enforcement via Hooks + CLAUDE.md Rules

## Problematica
El agente implementa features y despues (o nunca) escribe tests.
Esto produce tests que verifican la implementacion en vez del comportamiento,
mocks incompletos, y tests que no se actualizan cuando cambia el codigo.

Sesion 17: 249 tests rotos por features commiteadas sin actualizar tests.

## Contexto
- Skill TDD existe pero solo se activa cuando se pide explicitamente
- CLAUDE.md no tiene reglas sobre test-first
- No hay hooks que validen que los tests se escribieron antes del codigo
- No hay pre-commit hook que corra vitest

## Implementacion — 3 capas

### Capa 1: CLAUDE.md rules (instruccion al agente)
Agregar seccion "TDD Obligatorio" en CLAUDE.md:
- Para CUALQUIER cambio en `backend/src/routes/` o `clients/*/src/pages/` o `clients/*/src/components/`:
  1. PRIMERO escribir/actualizar el test que falla (RED)
  2. DESPUES implementar el codigo (GREEN)
  3. Correr `vitest run` y verificar que pasa
- Si se agrega un nuevo metodo Prisma en un route: AGREGAR al mock en setup.ts
- Antes de commit: correr suite completa, no solo tests afectados

### Capa 2: Claude Code hooks (interceptor automatico)
Hook `PreToolUse` que se activa en Edit/Write de archivos de produccion:
- Si el archivo editado es `routes/*.ts`, `pages/*.tsx`, o `components/*.tsx`
- Verificar que en la misma sesion ya se edito/creo el test correspondiente
- Si no: emitir warning "TDD: Escribi el test primero"

### Capa 3: Pre-commit hook
Script que corre `vitest run` antes de cada commit.
Bloquea commit si hay tests fallando.

## Criterio de aceptacion
- El agente escribe tests ANTES de implementar codigo en el 100% de los casos
- No se puede commitear con tests rotos
- Los mocks de Prisma se actualizan cuando se agregan metodos nuevos
- Reglas documentadas en CLAUDE.md y enforzadas por hooks

## Notas
- El hook PreToolUse es consultivo, no bloqueante — depende de que el agente lo respete
- El pre-commit hook SI es bloqueante (exit 1 cancela commit)
- Balance: no bloquear hotfixes urgentes — permitir `--no-verify` con justificacion explicita
