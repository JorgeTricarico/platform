# A2: Preflight Check Antes de Git Push

## Problematica

Se pushea codigo sin verificar types, sin correr tests, con console.logs sueltos o potencialmente con archivos .env commiteados. Estos problemas llegan a produccion o al repositorio publico.

## Contexto

El flujo de trabajo actual no tiene una capa de verificacion antes del push. Cada item por si solo es menor, pero acumulados generan bugs en produccion, codigo sucio y riesgos de seguridad (especialmente .env commiteados).

## Implementacion propuesta

- Crear un skill `preflight-check` que el agente ejecute antes de hacer `git push`.
- El skill corre los siguientes checks en orden:
  1. `tsc --noEmit` — verificar que no hay errores de tipos
  2. `vitest run` — verificar que todos los tests pasan
  3. `grep -r "console.log" src/` — detectar console.logs sueltos
  4. Verificar que `.env` y archivos de secrets esten en `.gitignore` y no esten staged
- Si cualquier check falla, el push se cancela y se reporta exactamente que fallo y en que archivo.
- Configurar tambien como hook pre-push de git.

## Criterio de aceptacion

- El push falla automaticamente si hay errores de TypeScript.
- El push falla si hay tests fallando.
- El push falla si hay `console.log` en archivos de `src/`.
- El push falla si se detecta un archivo `.env` en el staging area.

## Notas

- El check de console.log puede tener falsos positivos (ej: logs intencionales en produccion). Considerar una convencion como `logger.info` para logs intencionales y filtrar solo `console.log` raw.
- El check de .env debe ser preventivo, no reactivo — una vez pusheado, el secreto esta comprometido.
- Documentar como hacer bypass consciente del preflight en casos de emergencia.
