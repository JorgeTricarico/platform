import { useEffect, useState } from 'react';
import { fetchAppointments, fetchFinances, createAppointment } from '../services/api';
import type { DBAppointment, DBFinance } from '../services/api';
import { BUSINESS } from '../config';

export default function Dashboard() {
  const [appointments, setAppointments] = useState<DBAppointment[]>([]);
  const [finances, setFinances] = useState<DBFinance[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '', clientPhone: '', service: '', duration: BUSINESS.defaultDuration, date: '', time: '', price: 0, notes: ''
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([fetchAppointments(), fetchFinances()])
      .then(([aData, fData]) => {
        setAppointments(aData);
        setFinances(fData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error al cargar data:", err);
        setLoading(false);
      });
  };

  useEffect(() => { loadData(); }, []);

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

  if (loading && appointments.length === 0) return <div>Cargando dashboard...</div>;

  const pendingAppointments = appointments.filter(a => a.status === 'pendiente' || a.status === 'confirmado');
  const today = new Date().toISOString().split('T')[0];
  const upcomingAppointments = pendingAppointments
    .filter(a => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const totalIncome = finances.filter(f => f.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = finances.filter(f => f.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpenses;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente': return <span className="badge pending">Pendiente</span>;
      case 'confirmado': return <span className="badge completed">Confirmado</span>;
      case 'cancelado': return <span className="badge urgent">Cancelado</span>;
      case 'completado': return <span className="badge">Completado</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', options);
  };

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1>{BUSINESS.greeting}</h1>
          <p className="subtitle">{BUSINESS.subtitle}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Nueva Cita</button>
      </div>

      <div className="grid grid-cols-3" style={{ marginBottom: '40px' }}>
        <div className="card">
          <div className="stat-title">Citas Pendientes</div>
          <div className="stat-value">{pendingAppointments.length}</div>
        </div>
        <div className="card">
          <div className="stat-title">Balance Mensual</div>
          <div className="stat-value">{BUSINESS.currency}{balance.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="stat-title">Proximas Citas</div>
          <div className="stat-value" style={{ color: 'var(--urgent-color)' }}>{upcomingAppointments.length}</div>
        </div>
      </div>

      <h2>Agenda: Proximas Citas</h2>
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
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
              {upcomingAppointments.slice(0, 10).map(a => (
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
              {upcomingAppointments.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No hay citas proximas programadas.
                  </td>
                </tr>
              )}
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
