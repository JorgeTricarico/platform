import { useEffect, useState } from 'react';
import { fetchStaleGarments } from '../services/api';
import type { StaleGarment } from '../services/api';

export default function StaleGarmentsWidget() {
  const [garments, setGarments] = useState<StaleGarment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaleGarments()
      .then(setGarments)
      .catch(err => console.error('Error cargando prendas sin retirar:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card"><p>Cargando prendas...</p></div>;

  const formatDate = (dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', options);
  };

  const daysOverdue = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr + 'T00:00:00').getTime();
    return Math.floor(diff / 86400000);
  };

  return (
    <div className="card">
      <div className="stat-title">Prendas Listas sin Retirar</div>
      {garments.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', margin: '16px 0 0' }}>No hay prendas pendientes de retiro.</p>
      ) : (
        <div style={{ marginTop: '12px' }}>
          {garments.map(g => (
            <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color, #eee)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{g.clientName}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{g.garmentName} — {g.repairType}</div>
              </div>
              <span className="badge urgent" style={{ fontSize: '12px' }}>{daysOverdue(g.deliveryDate)} dias — {formatDate(g.deliveryDate)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
