# C7: Migration automatica via Supabase SQL

## Problematica
prisma db push no funciona desde WSL. Cada cambio de schema requiere ir manualmente al Supabase SQL Editor y ejecutar ALTER TABLE. Es facil olvidarse y causa bugs silenciosos.

## Contexto
En sesion 3 se detecto que prisma db push falla por network/WSL issues. DIRECT_DATABASE_URL esta en .env. A3 (migration detector) detecta cambios pero no los ejecuta.

## Implementacion propuesta
1. Script `backend/scripts/migrate.ts` que:
   - Lee el schema.prisma actual
   - Compara con el estado de la DB (via introspection o un snapshot guardado)
   - Genera los ALTER TABLE necesarios
   - Los ejecuta via pg directamente contra DIRECT_DATABASE_URL
2. Alternativa mas simple: usar MCP Supabase (C6) para ejecutar SQL directamente

## Criterio de aceptacion
- Cambios en schema.prisma se reflejan en la DB con un solo comando
- No requiere acceso manual al Supabase SQL Editor
- Log de que se ejecuto y resultado

## Notas
Depende de C6 (MCP Supabase) idealmente. Alternativa: script directo con pg. Riesgo: destructive changes (DROP COLUMN) necesitan confirmacion humana.
