import { describe, it, expect } from 'vitest';
import { reconcilePendingNotifications } from './reconcilePending';

const pending = [
  { id: 'p1', garmentId: 'g1' },
  { id: 'p2', garmentId: 'g2' },
  { id: 'p3', garmentId: 'g3' },
];

describe('reconcilePendingNotifications', () => {
  it('keeps entries whose garment is still listo', () => {
    const garments = [
      { id: 'g1', status: 'listo' },
      { id: 'g2', status: 'listo' },
      { id: 'g3', status: 'listo' },
    ];
    expect(reconcilePendingNotifications(pending, garments)).toEqual(pending);
  });

  it('removes entries whose garment moved to entregado', () => {
    const garments = [
      { id: 'g1', status: 'listo' },
      { id: 'g2', status: 'entregado' },
      { id: 'g3', status: 'listo' },
    ];
    const result = reconcilePendingNotifications(pending, garments);
    expect(result.map(p => p.id)).toEqual(['p1', 'p3']);
  });

  it('removes entries whose garment regressed to en_proceso', () => {
    const garments = [
      { id: 'g1', status: 'en_proceso' },
      { id: 'g2', status: 'listo' },
      { id: 'g3', status: 'listo' },
    ];
    const result = reconcilePendingNotifications(pending, garments);
    expect(result.map(p => p.id)).toEqual(['p2', 'p3']);
  });

  it('removes entries whose garment was deleted (not present)', () => {
    const garments = [
      { id: 'g1', status: 'listo' },
      // g2, g3 deleted
    ];
    const result = reconcilePendingNotifications(pending, garments);
    expect(result.map(p => p.id)).toEqual(['p1']);
  });

  it('returns empty when no pending', () => {
    expect(reconcilePendingNotifications([], [{ id: 'g1', status: 'listo' }])).toEqual([]);
  });

  it('returns empty when no garments match', () => {
    expect(reconcilePendingNotifications(pending, [])).toEqual([]);
  });
});
