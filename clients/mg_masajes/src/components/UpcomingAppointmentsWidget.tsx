import React, { useEffect, useState } from 'react';
import { fetchDashboardAppointments } from '../services/api';
import type { DBAppointment } from '../services/api';
import { useDashboardRefresh } from './DashboardRefreshContext';

function UpcomingAppointmentsWidget() {
  const [appointments, setAppointments] = useState<DBAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshKey } = useDashboardRefresh();

  useEffect(() => {
    setLoading(true);
    fetchDashboardAppointments()
      .then(setAppointments)
      .catch(err => console.error('Error cargando citas agendadas:', err))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return <div className="card"><p>Cargando agenda...</p></div>;

  const formatDate = (dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', options);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente': return <span className="badge pending">Pendiente</span>;
      case 'confirmado': return <span className="badge completed">Confirmado</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '20px 20px 0' }}>
        <div className="stat-title">Agenda: Citas Futuras</div>
      </div>
      {appointments.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', padding: '0 20px 20px' }}>No hay citas proximas programadas.</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {appointments.slice(0, 10).map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.clientName}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{a.clientPhone}</div>
                  </td>
                  <td>{a.service}</td>
                  <td style={{ fontWeight: 600 }}>{formatDate(a.date)}</td>
                  <td style={{ fontWeight: 600 }}>{a.time}</td>
                  <td>{getStatusBadge(a.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default React.memo(UpcomingAppointmentsWidget);
