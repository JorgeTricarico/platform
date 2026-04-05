# M16: Shared Packages Workspace

## Problematica
Hay código 100% duplicado entre ambos clientes: db.ts, sync.ts, ToastContext.tsx, OfflineIndicator.tsx, cachedFetch/mutationFetch en api.ts, ChatDemo.tsx (solo difiere en 2 strings). Cada cambio hay que hacerlo dos veces y mantener sincronizado manualmente.

## Contexto
El monorepo tiene 3 proyectos independientes sin workspace configuration (ni pnpm-workspace.yaml ni package.json workspaces). No hay forma de compartir código sin copy-paste.

## Implementacion propuesta
1. Crear `packages/shared-ui/` con ToastContext, OfflineIndicator
2. Crear `packages/pwa-utils/` con db.ts, sync.ts, cachedFetch, mutationFetch
3. Configurar npm workspaces en root package.json
4. Actualizar tsconfig paths en ambos clientes
5. Actualizar imports en ambos clientes
6. Verificar que Vite resuelve los imports correctamente

## Criterio de aceptacion
- Zero código duplicado entre clientes para los módulos compartidos
- Ambos clientes buildean y tests pasan
- Un cambio en shared-ui se refleja en ambos clientes

## Notas
ChatDemo.tsx es candidato a shared también pero requiere parametrizar businessName y avatar.
