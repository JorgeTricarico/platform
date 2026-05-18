# Z36: Matchear entregas previas por clientId FK (no por phone)

## Problematica
El count de entregas previas usa `clientPhone` literal:
```ts
prisma.order.count({ where: { clientPhone, status: 'entregado', id: { not: prev.id } } })
```

Problemas:
1. Si Ana edita el teléfono del cliente, las órdenes viejas se "huerfanan" — historial perdido.
2. Si la normalización de teléfono cambió en el tiempo (script `normalize-phones-*.ts` corrió algunas veces), órdenes viejas pueden tener formato distinto al actual → no matchean.
3. El cliente real puede tener varios teléfonos a lo largo del tiempo.

## Contexto
Order tiene `clientPhone` pero NO tiene FK directa a `Client.id` actualmente (relación indirecta).

Detectado en audit 2026-05-18 (ALTO).

Relacionado: incidente memoria de normalización de teléfonos.

## Implementacion propuesta
1. Agregar FK `clientId String?` a `Order` (opcional para retro-compat).
2. Migración data: backfill `clientId` para órdenes existentes via match por phone normalizado.
3. Cambiar count a:
   ```ts
   prisma.order.count({
     where: {
       OR: [
         { clientId: client?.id },
         { clientPhone: normalizeArgentinePhone(updated.clientPhone).e164 },
       ],
       status: 'entregado',
       id: { not: prev.id },
     },
   });
   ```

## Criterio de aceptacion
- Migration genera `clientId` para >=95% de órdenes históricas.
- Test: cliente con teléfono cambiado conserva conteo correcto de entregas previas.
- Test: orden creada con clientId pero sin phone también cuenta.

## Notas
- Cambio mediano que toca schema, migración y route. Beneficio: histórico fiable para futuras métricas/CRM.
