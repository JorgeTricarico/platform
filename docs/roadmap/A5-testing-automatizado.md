# A5: Testing Automatizado Post-Implementacion

## Problematica

Al terminar de implementar una feature, el agente no corre los tests automaticamente. Las features se declaran completas sin verificacion, y los tests (si existen) solo se corren si el desarrollador lo pide explicitamente.

## Contexto

El patron actual es: implementar → declarar completo. Falta el paso de verificacion. Esto es consistente con el problema del A1 (TDD gate) pero desde el otro lado: A1 previene el commit sin tests, A5 asegura que los tests se corran automaticamente al terminar la implementacion, antes de siquiera llegar al commit.

## Implementacion propuesta

- Agregar un hook post-implementacion en el skill del agente:
  - Al completar la implementacion de cualquier feature, el agente ejecuta `vitest run` automaticamente.
  - Si los tests fallan, el agente NO declara la tarea como completa y reporta los fallos.
  - Si los tests pasan, incluye el resultado en el reporte final ("Tests: 12 passed, 0 failed").
- Agregar la ejecucion de tests como paso obligatorio en la checklist de "definition of done" del agente.
- El skill debe distinguir entre: tests de la feature nueva vs suite completa (correr ambos).

**Checklist de definition of done:**
1. Codigo implementado
2. Tests escritos (al menos caso feliz + caso de error)
3. `vitest run` ejecutado y pasando
4. Sin errores de TypeScript (`tsc --noEmit`)
5. Recien entonces: marcar como completo

## Criterio de aceptacion

- Al terminar cada implementacion de feature, el agente corre `vitest run` sin que se lo pidan.
- El reporte final de la tarea incluye el resultado de los tests.
- Si los tests fallan, la tarea no se marca como completa hasta resolver los fallos.

## Notas

- Complementa A1 (pre-commit hook) y A2 (preflight pre-push): cada barrera atrapa lo que la anterior no atajo.
- Registrar este patron en Engram para que persista entre sesiones y se aplique consistentemente.
- Si el proyecto no tiene tests para una feature nueva, el agente debe escribirlos como parte de la implementacion, no como paso opcional.
