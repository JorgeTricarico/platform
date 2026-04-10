import { useEffect, useState } from 'react';
import { fetchDashboardStalePatients } from '../services/api';
import type { DashboardStalePatient } from '../services/api';

export default function StalePatientWidget() {
  const [patients, setPatients] = useState<DashboardStalePatient[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetchDashboardStalePatients()
      .then(setPatients)
      .catch(err => console.error('Error cargando pacientes sin ficha:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener('dashboard-refresh', onRefresh);
    return () => window.removeEventListener('dashboard-refresh', onRefresh);
  }, []);

  if (loading) return <div className="card"><p>Cargando pacientes...</p></div>;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Sin ficha';
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', options);
  };

  return (
    <div className="card">
      <div className="stat-title">Pacientes sin Ficha Reciente</div>
      {patients.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', margin: '16px 0 0' }}>Todos los pacientes estan al dia.</p>
      ) : (
        <div style={{ marginTop: '12px' }}>
          {patients.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color, #eee)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{p.lastReason || 'Sin consulta previa'}</div>
              </div>
              <span className="badge urgent" style={{ fontSize: '12px' }}>{formatDate(p.lastVisit)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
