# Z37: Sync panel pendingNotifications con garmentsRef en tiempo real

## Problematica
Si una prenda en el panel "Avisar por WhatsApp" cambia de status desde otra pestaña, dispositivo o por edición desde Garments.tsx, la entry queda zombie en el panel mostrando un botón Avisar para algo que ya no está 'listo' (puede estar 'entregado' o 'en_proceso').

## Contexto
`clients/zenko/src/pages/QRScanner.tsx` — `pendingNotifications` se llena al escanear pero nunca se reconcilia contra `garmentsRef.current`.

Detectado en audit 2026-05-18 (ALTO).

## Implementacion propuesta
Cuando `garmentsRef.current` se actualice (polling, refresh, o cambio remoto), filtrar `pendingNotifications`:

```tsx
useEffect(() => {
  setPendingNotifications(prev =>
    prev.filter(p => {
      const g = garmentsRef.current.find(g => g.id === p.garmentId);
      return g?.status === 'listo'; // solo dejar las que sigan listas
    })
  );
}, [garmentsRefVersion]); // requiere un trigger reactivo cuando cambia
```

Mejor aún: polling cada N segundos del backend `GET /garments` y actualización via `setGarments` (state) en vez de `garmentsRef` (ref). Migrar parte del state.

## Criterio de aceptacion
- Test RTL: prenda en panel + simulación de cambio de status externo → entry desaparece.
- Test: refresh manual de garments también limpia entries.

## Notas
- Requiere migrar `garmentsRef` a state (re-render). Hoy usa ref para evitar re-renders al loop de escaneo — mantener ref para el loop pero crear state separado para el panel.
