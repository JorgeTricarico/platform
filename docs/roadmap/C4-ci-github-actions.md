# C4: CI con GitHub Actions

## Problematica

No hay CI. Codigo con errores de TypeScript o tests fallidos puede llegar a `main` y deployarse a Render sin ningun bloqueo automatico.

## Contexto

El build command en Render es `npx prisma generate && npx tsc`. Si el CI corre los mismos checks, los errores se detectan antes del deploy y no llegan a produccion.

## Implementacion propuesta

Crear `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci
        working-directory: apps/damian-backend

      - name: Type check
        run: npx tsc --noEmit
        working-directory: apps/damian-backend

      - name: Run tests
        run: npx vitest run
        working-directory: apps/damian-backend
```

Ajustar `working-directory` segun la estructura real del monorepo.

## Criterio de aceptacion

- El workflow aparece con badge verde en el README de GitHub
- Un push con errores de TypeScript falla el CI y bloquea el deploy
- Un push con tests fallidos falla el CI y bloquea el deploy
- El CI pasa en el estado actual del codigo

## Notas

- Para monorepos: usar `working-directory` o filtros de paths para correr solo lo necesario por cambio
- Agregar badge al README: `![CI](https://github.com/{org}/{repo}/actions/workflows/ci.yml/badge.svg)`
- Si se agrega cache de Prisma, asegurarse de incluir `prisma generate` en el step de setup
- GitHub Actions es gratuito para repos publicos y tiene 2000 min/mes para repos privados
