import { useEffect, useState } from 'react';
import { fetchStaleGarments } from '../services/api';
import type { StaleGarment } from '../services/api';
import { BUSINESS } from '../config';
import { SkeletonCard } from './SkeletonLoader';

export default function StaleGarmentsWidget() {
  const [garments, setGarments] = useState<StaleGarment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaleGarments()
      .then(setGarments)
      .catch(err => console.error('Error cargando prendas sin retirar:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonCard />;

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
            <div key={g.id} className="stale-garment-item">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{g.clientName}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{g.garmentName} — {g.repairType}</div>
              </div>
              <div className="stale-garment-actions">
                <span className="badge urgent" style={{ fontSize: '12px' }}>{daysOverdue(g.deliveryDate)} dias — {formatDate(g.deliveryDate)}</span>
                <a
                  className="btn btn-small"
                  href={`https://wa.me/${g.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(BUSINESS.whatsappReminderMsg(g.clientName, g.garmentName))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ backgroundColor: '#f0fff4', border: '1px solid #9ae6b4', color: '#276749', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  Avisar
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
