import { useEffect, useState } from 'react';
import { fetchDashboardToday } from '../services/api';
import type { DBAppointment } from '../services/api';

export default function TodayAppointmentsWidget() {
  const [appointments, setAppointments] = useState<DBAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetchDashboardToday()
      .then(setAppointments)
      .catch(err => console.error('Error cargando turnos de hoy:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener('dashboard-refresh', onRefresh);
    return () => window.removeEventListener('dashboard-refresh', onRefresh);
  }, []);

  if (loading) return <div className="card"><p>Cargando turnos de hoy...</p></div>;

  return (
    <div className="card">
      <div className="stat-title">Turnos de Hoy</div>
      {appointments.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', margin: '16px 0 0' }}>No hay turnos programados para hoy.</p>
      ) : (
        <div style={{ marginTop: '12px' }}>
          {appointments.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color, #eee)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{a.clientName}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{a.service}</div>
              </div>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>{a.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
