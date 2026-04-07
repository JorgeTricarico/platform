---
name: Stack Version Compatibility
description: Versiones compatibles del stack — vite, jsdom, Express 5, Node, Render constraints
type: reference
---

## Stack del Proyecto

| Capa | Tech | Versión |
|------|------|---------|
| Runtime | Node.js | 20.x (local), 22.x (Render default) |
| Backend | Express | 5.x |
| ORM | Prisma | 7.6+ con @prisma/adapter-pg |
| DB | PostgreSQL | Supabase (pooler) |
| Frontend | React | 19.x |
| Bundler | Vite | 7.x (NO 8 — incompatible con vite-plugin-pwa) |
| PWA | vite-plugin-pwa | 1.2.0 (soporta vite 3-7) |
| Tests backend | Vitest | 4.x |
| Tests frontend | Vitest + jsdom | 4.x + jsdom 25.x (NO 29 — requiere Node 22+) |
| TypeScript | ~5.9.x con verbatimModuleSyntax |
| Deploy | Render | Free tier, auto-deploy from main |

## Constraints clave

### Vite 8 NO soportado
`vite-plugin-pwa@1.2.0` (última versión) no incluye vite 8 en sus peer deps. Quedarse en vite ^7.0.0.
`@vitejs/plugin-react` debe ser ^5.0.0 (no ^6, que requiere vite 8).

### jsdom 29 requiere Node 22+
jsdom ^29 usa ESM top-level await que falla con `require()` en Node 20. Usar jsdom ^25.0.0 mientras Node local sea 20.x.

### Express 5 tipos
`req.params` values son `string | string[]`. Siempre castear: `const id = req.params.id as string`.
`req.query` values también necesitan cast: `req.query.foo as string`.

### TypeScript verbatimModuleSyntax
Los imports de tipos DEBEN usar `type` keyword:
```typescript
import { useState, type FormEvent } from 'react';
import { type ReactNode } from 'react';
```

### Render Free Tier
- Los servicios se duermen por inactividad (~15min)
- El slug/URL se asigna al crear y NO se cambia
- Static sites no tienen logs accesibles via API
- `clearCache: "clear"` en deploy API para limpiar cache de node_modules
