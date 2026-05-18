# Z45: Estado vacío del panel "Avisar por WhatsApp"

## Problematica
Cuando no hay prendas listas en sesión, el panel "Avisar por WhatsApp" no se muestra en absoluto. Para usuarios nuevos (o Ana en su primera sesión del día), no es claro que existe esa funcionalidad hasta que escanean.

## Contexto
`clients/zenko/src/pages/QRScanner.tsx` — `{pendingNotifications.length > 0 && (...)}` esconde todo cuando lista vacía.

Detectado en audit 2026-05-18 (BAJO).

## Implementacion propuesta
Mostrar siempre el header del panel + un hint visual cuando esté vacío:
```tsx
<h3>📤 Avisar por WhatsApp ({count})</h3>
{count === 0 ? (
  <div className="text-xs text-muted-foreground italic">
    Aquí se acumularán las prendas que pases a "Listo" para avisar a los clientes.
  </div>
) : (
  // ... lista actual
)}
```

## Criterio de aceptacion
- Panel visible siempre (con título y hint).
- Hint desaparece cuando hay items.
- Mobile: no rompe layout en pantallas chicas.

## Notas
- Polish menor.
