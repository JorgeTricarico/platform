# M38: Template base para nuevo cliente

## Problematica
Crear un nuevo cliente (ej: peluquería, consultorio, gym) requiere copiar código de Zenko y adaptar manualmente. No hay un scaffold automatizado.

## Contexto
- M34 implementó `BusinessConfig` dinámico — nuevo negocio = entrada en BUSINESS_REGISTRY
- Pero las páginas (Dashboard, CRUD, Finanzas) siguen siendo específicas de Zenko
- Para ser una plataforma real, necesitamos que un nuevo cliente se genere desde un template

## Implementacion propuesta

### Fase 1: Template genérico
1. Crear `clients/_template/` con páginas base:
   - `Dashboard.tsx` — stats genéricas (items activos, completados, ingresos mes)
   - `Items.tsx` — CRUD genérico (tabla/cards, crear/editar/eliminar)
   - `Clients.tsx` — CRUD de clientes (reutilizable)
   - `Finances.tsx` — ingresos/egresos (reutilizable)
2. Cada página lee su configuración de `BusinessConfig`
3. Los campos del CRUD se definen en el config (schema-driven)

### Fase 2: Script scaffold
1. `npm run create-client <slug>` genera:
   - `clients/<slug>/` con copia del template
   - Entrada en `BUSINESS_REGISTRY`
   - `.env` con `VITE_BUSINESS=<slug>`
   - Ruta backend en `backend/src/routes/<slug>.ts`
   - Modelo Prisma base

### Fase 3: Personalización
1. Cada cliente puede override páginas individuales
2. Componentes custom se registran en el config
3. Temas/colores por cliente via CSS variables en `@theme`

## Criterio de aceptacion
- [ ] Template genérico funciona standalone
- [ ] Script scaffold crea cliente funcional en < 5 minutos
- [ ] Cliente nuevo tiene Dashboard + 1 CRUD + Finanzas + Clientes funcionando
- [ ] Sin necesidad de tocar código compartido

## Notas
- Depende de M35 (Refine) para simplificar los CRUDs
- Depende de M37 (DataView) para las tablas/cards genéricas
- El schema del CRUD podría definirse en JSON y generar el formulario automáticamente
