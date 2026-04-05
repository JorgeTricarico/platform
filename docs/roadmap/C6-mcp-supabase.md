# C6: Configurar MCP Supabase para Migraciones Directas

## Problematica
Actualmente las migraciones de DB requieren ir al SQL Editor de Supabase manualmente. El pooler (6543) no soporta DDL y el puerto directo (5432) no es accesible desde WSL. Esto agrega friccion a cada cambio de schema.

## Contexto
- `prisma db push` via pooler se cuelga (PgBouncer no soporta DDL)
- Puerto 5432 directo no accesible desde WSL (timeout)
- Solucion actual: copiar ALTER TABLE al SQL Editor de Supabase dashboard
- Existe un MCP de Supabase disponible en claude.ai que permite ejecutar SQL directamente

## Implementacion propuesta
- Autenticar el MCP de Supabase via `/mcp` en Claude Code
- Verificar que permite ejecutar queries DDL (CREATE TABLE, ALTER TABLE)
- Documentar el flujo: cambiar schema.prisma -> generar SQL -> ejecutar via MCP
- Alternativamente: usar Supabase CLI (`supabase db push`) que tiene acceso directo

## Criterio de aceptacion
- Las migraciones se pueden ejecutar sin salir del editor/terminal
- No requiere copiar SQL manualmente al dashboard

## Notas
- El MCP requiere OAuth — solo funciona en sesiones donde el usuario se autentico
- Alternativa: Supabase CLI con access token configurado en .env
- Considerar si vale la pena migrar a Prisma migrations formales (prisma migrate) vs db push
