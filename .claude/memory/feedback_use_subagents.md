---
name: use-subagents-aggressively
description: Delegar lectura de archivos Y ediciones que toquen más de 2 archivos a sub-agentes para preservar el contexto del orquestador
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 75d968a2-5b89-4094-b18c-b6fd1d54e038
---

NUNCA leer archivos directamente en el agente principal. SIEMPRE delegar a sub-agentes para:
- Lectura y exploración de archivos (cualquier archivo, cualquier tamaño)
- Tareas de implementación que toquen MÁS de 2 archivos
- Refactors cross-file

**Why:** El context window se llena muy rápido cuando el agente principal lee o edita múltiples archivos directamente. La sesión 9 se quedó sin contexto por lecturas directas. El usuario reiteró explícitamente el 2026-05-16: "usar sub agentes si tocas mas de 2 archivos. y te contaminas, estas en opus max efforce". Incluso en Opus max effort, la contaminación de contexto es el cuello de botella, no la capacidad del modelo.

**How to apply:** Para cada tarea:
1. Lectura/búsqueda → SIEMPRE sub-agente (tipo Explore para read-only)
2. Editar 1-2 archivos → el agente principal puede hacerlo directo
3. Editar 3+ archivos → dividir en sub-agentes paralelos (general-purpose, con `isolation: "worktree"` si hay riesgo de conflicto)
4. Paralelizar sub-agentes independientes siempre (múltiples Agent calls en UN solo mensaje)
5. Rol del agente principal: planear, delegar, sintetizar reportes, decidir. NO ejecutar.
6. Dar specs MUY detalladas (incluida la spec completa de funciones a implementar) para que sub-agentes paralelos produzcan resultados consistentes sin necesidad de coordinarse entre sí.

Related: [[subagent-strategy]] (cuándo usar worktrees vs sesión principal para patrones compartidos)
