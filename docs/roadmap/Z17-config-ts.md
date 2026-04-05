# Z17: config.ts para Zenko

## Problematica
Zenko no tiene config.ts. El greeting "Hola, Ana" está hardcodeado en Dashboard.tsx:81. Los repair types (dobladillo, cierre, etc) están hardcodeados en 2 archivos distintos. El currency `$` está hardcodeado en Finances.tsx en vez de usar una constante.

## Contexto
Damian SÍ tiene config.ts con BUSINESS object: name, owner, greeting, services, currency. Zenko debería tener lo mismo para consistencia y mantenibilidad.

## Implementacion propuesta
1. Crear `clients/zenko/src/config.ts` con BUSINESS object: name, owner, greeting, repairTypes, currency, statuses
2. Actualizar Dashboard.tsx para usar BUSINESS.greeting
3. Actualizar Garments.tsx y Dashboard.tsx para usar BUSINESS.repairTypes en los <select>
4. Actualizar Finances.tsx para usar BUSINESS.currency

## Criterio de aceptacion
- Zero strings de negocio hardcodeados en componentes
- Todos los repair types vienen de config.ts
- Currency viene de config.ts
- Tests existentes pasan

## Notas
Sigue el patrón exacto de damian/src/config.ts.
