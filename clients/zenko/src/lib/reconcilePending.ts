// Z37: reconcile pending WhatsApp notifications against the latest garment snapshot.
// Removes entries whose garment is no longer 'listo' (was edited externally,
// re-scanned to entregado, or deleted) to prevent zombie entries in the panel.

export interface PendingLike {
  garmentId: string;
}

export interface GarmentLike {
  id: string;
  status: string;
}

export function reconcilePendingNotifications<P extends PendingLike>(
  pending: P[],
  garments: GarmentLike[],
): P[] {
  return pending.filter(p => {
    const g = garments.find(g => g.id === p.garmentId);
    return g?.status === 'listo';
  });
}
