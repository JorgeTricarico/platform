# A1: TDD Gate — Tests Obligatorios Antes de Completar

## Problematica

El agente puede marcar tareas como completas sin que los tests pasen o existan. Esto causo el bug de garments POST donde una feature se marco como lista pero fallaba en runtime por falta de cobertura de tests.

## Contexto

El flujo actual permite que el agente implemente una feature y la declare completa sin ejecutar ni escribir tests. Esto genera deuda tecnica oculta y bugs que llegan a produccion. El problema es sistemico: sin un gate automatico, depende de la disciplina del momento.

## Implementacion propuesta

- Agregar regla en `CLAUDE.md` y en el skill relevante: "antes de marcar un task como completo, los tests deben pasar".
- Configurar un hook pre-commit con Husky (o similar) que ejecute `vitest run` antes de permitir el commit.
- Si los tests fallan, el commit se bloquea con un mensaje claro indicando que tests fallaron.
- El agente debe incluir en su checklist de "definition of done":
  1. Feature implementada
  2. Tests escritos para el caso feliz y casos de error
  3. `vitest run` pasa sin errores

## Criterio de aceptacion

- No es posible hacer un commit si `vitest run` falla.
- El agente no marca un task como completo sin haber corrido los tests exitosamente.
- El hook pre-commit esta documentado en el onboarding del proyecto.

## Notas

- Balancear velocidad vs rigor: el hook puede tener un flag de escape (`--no-verify`) para casos extremos, pero debe ser explicito y consciente.
- Considerar correr solo los tests relacionados a los archivos cambiados (vitest `--changed`) para no penalizar commits pequenos.
- Registrar este patron como aprendizaje en Engram para que persista entre sesiones.
