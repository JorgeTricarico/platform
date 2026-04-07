---
name: Prisma + Supabase Connection Guide
description: Errores comunes de conexión Prisma con Supabase pooler — puertos, adapter, seed config
type: reference
---

## Conexión Prisma → Supabase

Este proyecto usa `@prisma/adapter-pg` (driver adapters mode), NO el query engine default.

### Puertos del Pooler Supabase

| Puerto | Modo | Uso |
|--------|------|-----|
| 6543 | Transaction mode | App queries (DATABASE_URL) — usado en runtime |
| 5432 | Session mode | DDL/migraciones (`prisma db push`, `prisma migrate`) |

**Why:** El pooler en transaction mode (6543) no soporta DDL ni prepared statements extendidos. `prisma db push` se cuelga infinitamente sin error si usa port 6543.

**How to apply:** Para migraciones, SIEMPRE usar el pooler session mode (port 5432):
```
postgresql://postgres.PROJECT:PASSWORD@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

### URL directa (db.PROJECT.supabase.co:5432) NO funciona

La URL directa `db.mdspjstgmjkwcpmttpec.supabase.co:5432` da P1001 (can't reach). Usar siempre el pooler (aws-1-us-east-2.pooler.supabase.com) con el puerto correcto.

### PrismaClient necesita adapter

**Error:** `PrismaClient needs to be constructed with non-empty valid PrismaClientOptions`

**Causa:** `new PrismaClient()` sin adapter falla porque el schema usa driver adapters.

**Fix:** Siempre instanciar con el adapter de pg:
```typescript
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

Esto aplica a: seed.ts, scripts one-off, tests, cualquier archivo que use PrismaClient.

### Seed script

- Path correcto: `prisma/seed.ts` (no `src/seed.ts`)
- Package.json script: `"seed": "npx tsx prisma/seed.ts"`
- Debe importar `dotenv/config` al inicio
- Debe cerrar pool al final: `await pool.end()`

### Comando para push schema

```bash
cd backend
source .env
DATABASE_URL="$DIRECT_DATABASE_URL" npx prisma db push --accept-data-loss
```

O directamente con session mode URL:
```bash
DATABASE_URL="postgresql://postgres.PROJECT:PASS@aws-1-us-east-2.pooler.supabase.com:5432/postgres" npx prisma db push
```

### Express 5 — req.params es `string | string[]`

**Error:** `Type 'string | string[]' is not assignable to type 'string'` en rutas con `:id`

**Causa:** Express 5 (@types/express 5.x) cambió el tipo de `req.params` values de `string` a `string | string[]`.

**Fix:** Nunca usar `const { id } = req.params` — siempre castear:
```typescript
const id = req.params.id as string;
```

### vite-plugin-pwa vs Vite 8

`vite-plugin-pwa@1.2.0` no soporta `vite@8`. No hay versión compatible.
**Fix:** Agregar `.npmrc` con `legacy-peer-deps=true` en cada cliente, o usar `--legacy-peer-deps` en el build command de Render.

### Render slugs

El slug/URL de un servicio Render se asigna al crear y NO se puede cambiar. Si el slug no matchea el nombre deseado, hay que eliminar y recrear el servicio.
