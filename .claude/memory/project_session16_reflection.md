---
name: Session 16 Reflection
description: UX orders mejorado, retro profunda — bugs criticos detectados (client validation, Dashboard form duplicado, backend enums), roadmap actualizado
type: project
---

## Session 16 — 2026-04-06

### Completado
| Feature | Detalle |
|---------|---------|
| Cliente en orden | Toggle "existente" (autocomplete search) vs "nuevo" (inline). Homónimos diferenciados por teléfono |
| Tipo arreglo "Otro" | 6 opciones + texto libre |
| Sort por estado | listo > en_proceso > recibido > entregado |
| Búsqueda mejorada | Filtra por repairType y description |
| Badges de estado | Colores, símbolos, nowrap. Fix post-deploy: compactados |
| Spacing | subtitle margin 32px → 8px |
| Tests | 16 tests Garments (57 total zenko) |

### Bugs detectados en retro
1. **CRITICO**: Hidden inputs `required` no validan — modo "Cliente existente" puede submitear vacío
2. **CRITICO**: Dashboard tiene form de crear orden duplicado/desactualizado (sin intakeDate, sin Otro, sin client search)
3. **ALTO**: Backend status acepta cualquier string, price puede ser NaN, search vacío devuelve todo
4. **ALTO**: Order no tiene FK a Client — relación por phone string matching, frágil

### Roadmap actualizado (priorizado)
1. Fix validación cliente existente (bug)
2. Unificar Dashboard form con GarmentModal compartido
3. Backend validations (enum status, positive price, empty search)
4. Filtro por estado (chips/tabs)
5. Indicador órdenes vencidas
6. Acción rápida "Marcar entregado"
7. textarea para descripción, tel: link, extraer componentes
8. FK clientId migration
9. Features QR/foto (pendiente sessions anteriores)
