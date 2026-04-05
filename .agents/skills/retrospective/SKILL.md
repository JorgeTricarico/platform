---
name: retrospective
description: "Reflexion de fin de sesion + actualizacion de roadmap. TRIGGER cuando: 'reflexion', 'retrospectiva', 'que aprendimos', 'actualiza el roadmap', 'cierre de sesion', 'wrap up', 'session end', 'que mejoramos', o cuando el usuario indica que la sesion esta terminando.
DO NOT TRIGGER cuando: el usuario esta en medio de implementacion activa."
roles: [developer]
---

# Retrospective — Reflexion + Roadmap

Skill obligatorio al cierre de cada sesion de trabajo. Genera reflexion y actualiza el roadmap vivo.

## Protocolo (ejecutar EN ORDEN)

### Paso 1: Reflexion de sesion

Crear archivo `docs/reflections/YYYY-MM-DD.md` con esta estructura:

```markdown
# Reflexion — {fecha}

## Que se hizo
- Lista de features/fixes implementados

## Que salio bien
- Decisiones acertadas, patterns que funcionaron

## Que salio mal
- Bugs encontrados, tiempo perdido, decisiones erroneas

## Lecciones aprendidas
- Que hariamos diferente la proxima vez

## Ideas nuevas surgidas
- Features, mejoras, optimizaciones que surgieron durante la sesion
```

### Paso 2: Actualizar ROADMAP.md

Para CADA item del roadmap:
1. Si se **completo** en esta sesion → marcar como `completado` y agregar fecha
2. Si se **avanzó** parcialmente → marcar como `en progreso`
3. Si se descubrio que es **irrelevante** → marcar como `descartado` con razon

Para CADA idea nueva surgida en la reflexion:
1. Asignar ID siguiendo la convencion (C7, M8, L7, A6, etc.)
2. Agregar fila a la tabla correspondiente en ROADMAP.md
3. **OBLIGATORIO**: Crear documento `docs/roadmap/{ID}-{slug}.md` con el template:

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

**NO se puede agregar un item al roadmap sin su documento de referencia.**

### Paso 3: Commit

Commitear los cambios de reflexion + roadmap juntos con mensaje:
```
docs: retrospective {fecha} + roadmap update
```

### Paso 4: Generar prompt de continuacion

Al final, generar un prompt copy-pasteable para la proxima sesion que incluya:
- Items bloqueantes del roadmap
- Items en progreso
- Proximos items por prioridad
- Contexto critico de esta sesion (lecciones, bugs pendientes)

## Reglas

- **Siempre** crear reflexion, incluso si la sesion fue corta
- **Nunca** agregar item al roadmap sin documento en `docs/roadmap/`
- **Nunca** marcar como completado sin evidencia (tests pasan, deploy ok)
- Las reflexiones son **acumulativas** — no borrar las anteriores
- Si un item del roadmap se descarta, moverlo a una seccion "Descartados" con la razon
- Convertir fechas relativas a absolutas (ej: "la semana que viene" → "2026-04-12")
