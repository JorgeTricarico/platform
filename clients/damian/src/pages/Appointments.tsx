import { useEffect, useState } from 'react';
import { fetchAppointments, updateAppointmentStatus, createAppointment, updateAppointment, deleteAppointment } from '../services/api';
import type { DBAppointment } from '../services/api';
import { BUSINESS } from '../config';
import { useToast } from '../components/ToastContext';

export default function Appointments() {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [appointments, setAppointments] = useState<DBAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DBAppointment | null>(null);
  const [conflictError, setConflictError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dateFilter, setDateFilter] = useState<'todos' | 'hoy' | 'semana' | 'mes' | 'proximas' | 'historial'>('todos');
  const [formData, setFormData] = useState({
    clientName: '', clientPhone: '', service: '', duration: BUSINESS.defaultDuration, date: new Date().toISOString().split('T')[0], time: '', price: 0, notes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openEdit = (appointment: DBAppointment) => {
    setEditTarget(appointment);
    setConflictError('');
    setFormData({
      clientName: appointment.clientName,
      clientPhone: appointment.clientPhone,
      service: appointment.service,
      duration: appointment.duration,
      date: appointment.date,
      time: appointment.time,
      price: appointment.price,
      notes: appointment.notes || ''
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await updateAppointment(editTarget.id, { ...formData, duration: Number(formData.duration), price: Number(formData.price) });
      setEditTarget(null);
      setConflictError('');
      setFormData({ clientName: '', clientPhone: '', service: '', duration: BUSINESS.defaultDuration, date: '', time: '', price: 0, notes: '' });
      toast.success('Cita actualizada correctamente');
      loadData();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 409) {
        setConflictError((error as unknown as Error).message || 'Conflicto de horario');
      } else {
        toast.error('Error al actualizar la cita');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAppointment({ ...formData, duration: Number(formData.duration), price: Number(formData.price) });
      setIsModalOpen(false);
      setConflictError('');
      setFormData({ clientName: '', clientPhone: '', service: '', duration: BUSINESS.defaultDuration, date: '', time: '', price: 0, notes: '' });
      toast.success('Cita agendada correctamente');
      loadData();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 409) {
        setConflictError((error as unknown as Error).message || 'Conflicto de horario');
      } else {
        toast.error('Error al guardar la cita');
      }
    } finally {
      setSubmitting(false);
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta cita?')) return;
    try {
      await deleteAppointment(id);
      toast.success('Cita eliminada');
      loadData();
    } catch {
      toast.error('Error al eliminar la cita');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateAppointmentStatus(id, newStatus);
      toast.success('Estado actualizado correctamente');
      loadData();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  if (loading) return <div>Cargando lista de citas...</div>;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Monday
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);
  const yearMonth = todayStr.slice(0, 7); // 'YYYY-MM'

  const filtered = appointments.filter(a => {
    const matchesSearch =
      a.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.id.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (dateFilter === 'hoy') return a.date === todayStr;
    if (dateFilter === 'semana') return a.date >= weekStartStr && a.date <= weekEndStr;
    if (dateFilter === 'mes') return a.date.startsWith(yearMonth);
    if (dateFilter === 'proximas') return a.date >= todayStr;
    if (dateFilter === 'historial') return a.date < todayStr;
    return true;
  });

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
        <button className="btn btn-primary" onClick={() => { setIsModalOpen(true); setConflictError(''); }}>+ Nueva Cita</button>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            placeholder="Buscar por cliente, servicio o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-search"
          />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['todos', 'proximas', 'historial', 'hoy', 'semana', 'mes'] as const).map((f) => {
              const label = { todos: 'Todos', proximas: 'Próximas', historial: 'Historial', hoy: 'Hoy', semana: 'Esta semana', mes: 'Este mes' }[f];
              return (
                <button
                  key={f}
                  onClick={() => setDateFilter(f)}
                  className={`chip${dateFilter === f ? ' chip-active' : ''}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
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
                    {new Date(a.date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })} {a.time}
                  </td>
                  <td style={{ fontWeight: 600 }}>{BUSINESS.currency}{a.price.toLocaleString()}</td>
                  <td>{getStatusBadge(a.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        value={a.status}
                        onChange={(e) => handleStatusChange(a.id, e.target.value)}
                        className="btn-small"
                        style={{ cursor: 'pointer' }}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="completado">Completado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                      <button
                        type="button"
                        className="btn-small"
                        onClick={() => openEdit(a)}
                        style={{ cursor: 'pointer' }}
                      >Editar</button>
                      <button
                        type="button"
                        className="btn-small"
                        onClick={() => handleDelete(a.id)}
                        style={{ cursor: 'pointer', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                      >Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="card modal-card modal-md">
            <h2 style={{ marginTop: 0 }}>Agendar Nueva Cita</h2>
            <form onSubmit={handleSubmit} className="form-group">
              {/* Patient Group */}
              <div style={{ padding: '16px', backgroundColor: 'var(--surface-secondary)', borderRadius: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#666', marginBottom: '8px', display: 'block' }}>Información del Paciente</label>
                <div className="form-row">
                  <input required name="clientName" placeholder="Nombre completo" value={formData.clientName} onChange={handleInputChange} className="input" style={{ flex: 1 }} />
                  <input required name="clientPhone" placeholder="Teléfono" value={formData.clientPhone} onChange={handleInputChange} className="input" style={{ flex: 1 }} />
                </div>
              </div>

              {/* Service Details */}
              <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#666', marginBottom: '8px', display: 'block' }}>Detalles del Servicio</label>
                <select required name="service" value={formData.service} onChange={handleInputChange} className="input" style={{ marginBottom: '12px' }}>
                  <option value="">Tipo de Masaje...</option>
                  {BUSINESS.services.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="form-row">
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Duración (min)</label>
                    <input required name="duration" type="number" placeholder="Duración (min)" value={formData.duration} onChange={handleInputChange} className="input" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Precio ($)</label>
                    <input required name="price" type="number" value={formData.price || ''} onChange={handleInputChange} className="input" placeholder="Precio ($)" />
                  </div>
                </div>
              </div>

              {/* Date/Time Group */}
              <div style={{ padding: '16px', backgroundColor: '#f0f7ff', borderRadius: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#0055cc', marginBottom: '8px', display: 'block' }}>Programación</label>
                <div className="form-row">
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Fecha</label>
                    <input required name="date" type="date" value={formData.date} onChange={handleInputChange} className="input" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Hora</label>
                    <input required name="time" type="time" value={formData.time} onChange={handleInputChange} className="input" />
                  </div>
                </div>
              </div>

              <input name="notes" placeholder="Notas adicionales (opcional)..." value={formData.notes} onChange={handleInputChange} className="input" />

              {conflictError && (
                <p style={{ color: 'var(--danger, #e53e3e)', margin: '4px 0', fontSize: '14px' }}>{conflictError}</p>
              )}

              <div className="form-actions">
                <button type="button" onClick={() => { setIsModalOpen(false); setConflictError(''); }} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Agendando...' : 'Agendar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editTarget !== null && (
        <div className="modal-overlay">
          <div className="card modal-card modal-md">
            <h2 style={{ marginTop: 0 }}>Editar Cita</h2>
            <form onSubmit={handleEditSubmit} className="form-group">
              <div className="form-row">
                <input required name="clientName" placeholder="Nombre completo" value={formData.clientName} onChange={handleInputChange} className="input" style={{ flex: 1 }} />
                <input required name="clientPhone" placeholder="Teléfono" value={formData.clientPhone} onChange={handleInputChange} className="input" style={{ flex: 1 }} />
              </div>

              <select required name="service" value={formData.service} onChange={handleInputChange} className="input">
                <option value="">Tipo de Masaje...</option>
                {BUSINESS.services.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <div className="form-row">
                <input required name="duration" type="number" placeholder="Duración (min)" value={formData.duration} onChange={handleInputChange} className="input" style={{ flex: 1 }} />
                <input required name="price" type="number" placeholder="Precio ($)" value={formData.price || ''} onChange={handleInputChange} className="input" style={{ flex: 1 }} />
              </div>

              <div className="form-row">
                <input required name="date" type="date" value={formData.date} onChange={handleInputChange} className="input" style={{ flex: 1 }} />
                <input required name="time" type="time" value={formData.time} onChange={handleInputChange} className="input" style={{ flex: 1 }} />
              </div>

              <input name="notes" placeholder="Notas (opcional)..." value={formData.notes} onChange={handleInputChange} className="input" />

              {conflictError && (
                <p style={{ color: 'var(--danger, #e53e3e)', margin: '4px 0', fontSize: '14px' }}>{conflictError}</p>
              )}

              <div className="form-actions">
                <button type="button" onClick={() => { setEditTarget(null); setConflictError(''); }} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
