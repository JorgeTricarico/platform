---
name: Estrategia de sub-agentes para features
description: Cuándo usar sub-agentes con worktrees vs implementar en sesión principal
type: feedback
---

Para features paralelas e independientes (tocan archivos distintos), usar sub-agentes con `isolation: "worktree"` para contexto limpio.

**Why:** El usuario señaló que features independientes se benefician de ventanas de contexto más limpias. Los sub-agentes evitan contaminar el contexto principal con código de múltiples features.

**How to apply:**
- Features que tocan archivos distintos → sub-agentes en paralelo con worktrees
- Features con patrón compartido (copiar de una a otra) → sesión principal secuencial
- Siempre evaluar: ¿las features son independientes? ¿El contexto se va a contaminar?
- Para 2+ features independientes: preferir sub-agentes
