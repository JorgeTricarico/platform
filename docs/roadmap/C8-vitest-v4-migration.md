# C8: Vitest v4 Migration — workspace to projects API

## Problematica
vitest.workspace.ts usaba el formato v3 (`extends` + `test.root`) que no funciona en vitest v4.
Resultado: 249 tests failing con "document is not defined" porque jsdom no se cargaba.

## Contexto
- vitest ^4.1.2 en package.json pero workspace config en formato v3
- v4 elimino `--workspace` flag y cambio `defineWorkspace` por `test.projects`
- Los proyectos necesitan `defineProject` (no `defineConfig` de vite) para ser descubiertos

## Implementacion
1. Eliminar `vitest.workspace.ts`
2. Crear `vitest.config.ts` en root con `test.projects: ['clients/*', 'backend']`
3. Crear `vitest.config.ts` por cliente usando `defineProject` con `environment: 'jsdom'`
4. Backend mantiene su `vitest.config.ts` existente

## Criterio de aceptacion
- `npx vitest run` desde root ejecuta los 3 proyectos (zenko, damian, backend)
- `environment` muestra >5s (jsdom cargando)
- Todos los tests frontend pasan

## Notas
- En v4, `projects` con globs de directorio busca `vitest.config.*` o `vite.config.*`
- Pero `vite.config.ts` con `defineConfig` de vite NO se reconoce como proyecto — necesita `defineProject` de vitest
- El path de uploads tambien se rompio porque `path.resolve('uploads')` depende de cwd (que cambia en workspace)
