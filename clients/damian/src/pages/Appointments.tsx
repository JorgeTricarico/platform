import { useEffect, useState } from 'react';
import { fetchAppointments, updateAppointmentStatus, createAppointment } from '../services/api';
import type { DBAppointment } from '../services/api';
import { BUSINESS } from '../config';

export default function Appointments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [appointments, setAppointments] = useState<DBAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '', clientPhone: '', service: '', duration: BUSINESS.defaultDuration, date: '', time: '', price: 0, notes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAppointment({ ...formData, duration: Number(formData.duration), price: Number(formData.price) });
      setIsModalOpen(false);
      setFormData({ clientName: '', clientPhone: '', service: '', duration: BUSINESS.defaultDuration, date: '', time: '', price: 0, notes: '' });
      loadData();
    } catch (error) {
      alert("Error al guardar la cita");
    }
  };

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
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Nueva Cita</button>
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
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '450px', padding: '32px' }}>
            <h2 style={{ marginTop: 0 }}>Agendar Nueva Cita</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <input required name="clientName" placeholder="Nombre Cliente" value={formData.clientName} onChange={handleInputChange} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                <input required name="clientPhone" placeholder="Telefono" value={formData.clientPhone} onChange={handleInputChange} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>

              <select required name="service" value={formData.service} onChange={handleInputChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                <option value="">Tipo de Masaje...</option>
                {BUSINESS.services.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: '16px' }}>
                <input required name="duration" type="number" placeholder="Duracion (min)" value={formData.duration} onChange={handleInputChange} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                <input required name="price" type="number" placeholder="Precio ($)" value={formData.price || ''} onChange={handleInputChange} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <input required name="date" type="date" value={formData.date} onChange={handleInputChange} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                <input required name="time" type="time" value={formData.time} onChange={handleInputChange} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>

              <input name="notes" placeholder="Notas (opcional)..." value={formData.notes} onChange={handleInputChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Agendar Cita</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
