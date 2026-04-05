# M6: Responsive Completo — Ambos Clientes 100% Usables en Celular

## Problematica
Ana, Ariel y Damian acceden a la plataforma desde el celular entrando por web. Actualmente el layout (sidebar fija, tablas anchas, modales) no esta optimizado para pantallas chicas. Necesitan poder usar TODAS las funcionalidades desde el celular sin limitaciones.

## Contexto
- Ambos clientes (Zenko y Damian) usan layout con sidebar + main content
- Tablas de datos (ordenes, citas, pacientes) no tienen scroll horizontal ni adaptacion mobile
- Modales y formularios pueden quedar cortados en pantallas <400px
- El player de musica ambiente necesita funcionar bien en mobile
- No es PWA todavia (eso es L6), pero la web tiene que ser 100% funcional

## Implementacion propuesta

### Fase 1: Layout responsive
- Sidebar colapsable en mobile (hamburger menu)
- Breakpoint principal: 768px
- Main content ocupa 100% width en mobile

### Fase 2: Tablas y datos
- Tablas con scroll horizontal o vista card en mobile
- Listas de pacientes/ordenes como cards en vez de filas

### Fase 3: Formularios y modales
- Modales full-screen en mobile
- Inputs con tamanio adecuado (min 44px touch target)
- Date pickers nativos en mobile

### Fase 4: Componentes especificos
- Player de musica: controles apilados verticalmente
- Dashboard widgets: 1 columna en mobile
- Chat/Agent: input fijo en bottom

## Criterio de aceptacion
- Todos los flujos (CRUD completo de cada seccion) funcionan en pantalla de 375px width
- No hay scroll horizontal no deseado en ninguna vista
- Touch targets >= 44px
- Sidebar se oculta/muestra con hamburger en mobile
- Testeado en Chrome DevTools con iPhone SE, iPhone 14, Samsung Galaxy S21

## Notas
- Priorizar funcionalidad sobre estetica: que funcione todo > que se vea lindo
- Considerar usar CSS media queries en index.css (no framework adicional)
- L6 (PWA) es un paso posterior que agrega instalabilidad, pero M6 es pre-requisito
