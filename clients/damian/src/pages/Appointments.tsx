import { useEffect, useState } from 'react';
import { fetchAppointments, updateAppointmentStatus } from '../services/api';
import type { DBAppointment } from '../services/api';
import { BUSINESS } from '../config';

export default function Appointments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [appointments, setAppointments] = useState<DBAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    fetchAppointments()
      .then(data => {
        setAppointments(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error al obtener citas:", err);
        setLoading(false);
      });
  };

  useEffect(() => { loadData(); }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateAppointmentStatus(id, newStatus);
      loadData();
    } catch (error) {
      alert("Error al actualizar estado");
    }
  };

  if (loading) return <div>Cargando lista de citas...</div>;

  const filtered = appointments.filter(a =>
    a.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente': return <span className="badge pending">Pendiente</span>;
      case 'confirmado': return <span className="badge completed">Confirmado</span>;
      case 'cancelado': return <span className="badge urgent">Cancelado</span>;
      case 'completado': return <span className="badge">Completado</span>;
      default: return null;
    }
  };

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1>Gestion de Citas</h1>
          <p className="subtitle">Administra los turnos de tus clientes.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px' }}>
          <input
            type="text"
            placeholder="Buscar por cliente, servicio o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              width: '320px',
              outline: 'none',
              fontFamily: 'inherit',
              fontSize: '14px'
            }}
          />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Fecha / Hora</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>#{a.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.clientName}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{a.clientPhone}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.service}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{a.duration} min</div>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {new Date(a.date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} {a.time}
                  </td>
                  <td style={{ fontWeight: 600 }}>{BUSINESS.currency}{a.price.toLocaleString()}</td>
                  <td>{getStatusBadge(a.status)}</td>
                  <td>
                    <select
                      value={a.status}
                      onChange={(e) => handleStatusChange(a.id, e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="confirmado">Confirmado</option>
                      <option value="completado">Completado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
