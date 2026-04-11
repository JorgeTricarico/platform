# M35: Evaluar e integrar Refine como framework CRUD

## Problematica
Cada página CRUD (Garments, Clients, Finances, Appointments) repite el mismo patrón: fetch → state → tabla/cards → modales → CRUD operations. Para escalar a 10+ clientes empresariales, necesitamos un framework que abstraiga este boilerplate.

## Contexto
- **Refine** (34.4k stars) es un framework React headless para aplicaciones CRUD/admin
- Provee: data providers (REST, GraphQL, Supabase, etc.), access control, routing, notificaciones, audit logs
- Es **headless**: no impone UI, funciona con cualquier librería (shadcn/ui, Ant Design, Material UI)
- Soporta multi-tenant nativamente
- Ya tenemos shadcn/ui + Tailwind como capa visual

## Implementacion propuesta

### Fase 1: POC (1 página)
1. Instalar `@refinedev/core` + `@refinedev/rest` (data provider REST para nuestro backend Express)
2. Crear un data provider custom que use nuestras rutas `/api/zenco/garments`, `/api/zenco/clients`, etc.
3. Migrar Garments.tsx a Refine: `useTable`, `useCreate`, `useUpdate`, `useDelete`
4. Mantener UI actual (shadcn) — solo cambiar la capa de datos
5. Comparar: líneas de código, complejidad, developer experience

### Fase 2: Migración completa
1. Migrar todas las páginas CRUD a hooks de Refine
2. Implementar access control (roles admin/viewer por tenant)
3. Configurar routing de Refine (reemplazar hash routing)
4. Crear data provider para Damian (mg_masajes)

### Fase 3: Plantillas multi-cliente
1. Definir un "resource schema" por cliente (qué CRUDs tiene, qué campos, qué validaciones)
2. Generar páginas automáticamente desde el schema + BusinessConfig
3. Cada nuevo cliente = config JSON + customización visual mínima

## Criterio de aceptacion
- [ ] POC Garments funciona con Refine sin regresiones
- [ ] Build size no aumenta > 50KB
- [ ] Tests existentes siguen pasando
- [ ] Developer experience es mejor (menos código por página)
- [ ] Migración de un CRUD completo en < 2 horas

## Notas
- **Alternativa evaluada**: React Admin (26.6k stars) — más maduro pero acoplado a Material UI
- **Riesgo**: Refine agrega abstracción. Si la API de Refine cambia, afecta todo
- **Decisión**: ir headless con Refine, mantener shadcn para UI. Si el POC no convence, seguir con componentes custom
- **Referencia**: https://github.com/refinedev/refine
