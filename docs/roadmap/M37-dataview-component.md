# M37: DataView component reutilizable

## Problematica
Garments, Clients, Dashboard urgentes y Finances repiten el mismo patrón: tabla en desktop, cards en mobile. Cada página reimplementa esta lógica con Tailwind responsive classes duplicadas.

## Contexto
- 4 páginas usan el patrón tabla/cards
- Cada una tiene su propia implementación de `hidden md:block` / `md:hidden`
- Sort, filter y search se reimplementan en cada página
- Los tests verifican ambas vistas (mobile/desktop)

## Implementacion propuesta

### Componente `<DataView>`
```tsx
<DataView
  data={filtered}
  columns={[
    { key: 'clientName', label: 'Cliente', render: (g) => <ClientCell g={g} /> },
    { key: 'garmentName', label: 'Prenda' },
    { key: 'status', label: 'Estado', render: (g) => <Badge variant={g.status}>{g.status}</Badge> },
  ]}
  cardRender={(item) => <GarmentCard g={item} />}
  emptyMessage="No se encontraron órdenes."
  sortable
  searchable
/>
```

### Features built-in:
- **Desktop**: `<table>` con headers, sort por columna clickeable
- **Mobile**: cards renderizadas con `cardRender` prop
- **Search**: input integrado con debounce
- **Pagination**: opcional, client-side o server-side
- **Empty state**: mensaje configurable
- **Loading**: skeleton automático

### Nota sobre Refine:
Si M35 (Refine) se implementa primero, Refine ya provee `useTable` con sort/filter/pagination. El DataView sería solo la capa visual sobre los hooks de Refine.

## Criterio de aceptacion
- [ ] Componente DataView funciona con datos genéricos (tipado con generics)
- [ ] Garments migrado a usar DataView sin regresiones
- [ ] Mobile cards se renderizan correctamente
- [ ] Sort por columna funciona
- [ ] < 200 líneas de código total

## Notas
- Si Refine se adopta, este componente se simplifica a wrapper visual sobre `useTable`
- Evaluar si conviene usar TanStack Table como base (ya probado en el ecosistema shadcn)
