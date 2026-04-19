import { useEffect, useState, useMemo } from 'react';
import { fetchAppointments, updateAppointmentStatus, createAppointment, updateAppointment, deleteAppointment } from '../services/api';
import type { DBAppointment } from '../services/api';
import { BUSINESS } from '../config';
import { useToast } from '../components/ToastContext';
import { SkeletonLoader } from '../components/SkeletonLoader';

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
    clientName: '', clientPhone: '', service: '', duration: 40, date: new Date().toISOString().split('T')[0], time: '', price: 0, notes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'service' && value in (BUSINESS.services as any)) {
      const selected = (BUSINESS.services as any)[value];
      setFormData(prev => ({
        ...prev,
        service: value,
        price: selected.price,
        duration: selected.duration
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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
      setFormData({ clientName: '', clientPhone: '', service: '', duration: 40, date: '', time: '', price: 0, notes: '' });
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
      setFormData({ clientName: '', clientPhone: '', service: '', duration: 40, date: '', time: '', price: 0, notes: '' });
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

  const filtered = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Monday
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);
    const yearMonth = todayStr.slice(0, 7); // 'YYYY-MM'

    return appointments.filter(a => {
      const matchesSearch =
        a.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.service.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (dateFilter === 'hoy') return a.date === todayStr;
      if (dateFilter === 'semana') return a.date >= weekStartStr && a.date <= weekEndStr;
      if (dateFilter === 'mes') return a.date.startsWith(yearMonth);
      if (dateFilter === 'proximas') return a.date >= todayStr && a.status !== 'cancelado';
      if (dateFilter === 'historial') return a.date < todayStr || a.status === 'cancelado';
      return true;
    });
  }, [appointments, searchTerm, dateFilter]);

  if (loading) return <SkeletonLoader rows={5} />;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente': return <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-(--color-accent)">Pendiente</span>;
      case 'confirmado': return <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-(--color-success)">Confirmado</span>;
      case 'cancelado': return <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-(--color-destructive)">Cancelado</span>;
      case 'completado': return <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-(--color-muted) text-(--color-foreground)">Completado</span>;
      default: return null;
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-md border border-(--color-border) bg-(--color-card) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50";

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1>Gestion de Citas</h1>
          <p className="subtitle" style={{ margin: 0 }}>Administra los turnos de tus clientes.</p>
        </div>
        <button
          className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-(--color-primary) text-white font-semibold text-[15px] hover:bg-(--color-accent) hover:shadow-md transition-all"
          onClick={() => { setIsModalOpen(true); setConflictError(''); }}
        >
          + Nueva Cita
        </button>
      </div>

      <div className="bg-(--color-card) rounded-2xl shadow-sm border border-(--color-border) overflow-hidden">
        <div className="flex flex-col gap-3 p-4 border-b border-(--color-border)">
          <input
            type="text"
            placeholder="Buscar por cliente o servicio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-search w-full px-4 py-2 rounded-xl border border-(--color-border) bg-(--color-muted) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            {(['todos', 'proximas', 'historial', 'hoy', 'semana', 'mes'] as const).map((f) => {
              const label = { todos: 'Todos', proximas: 'Próximas', historial: 'Historial', hoy: 'Hoy', semana: 'Esta semana', mes: 'Este mes' }[f];
              return (
                <button
                  key={f}
                  onClick={() => setDateFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    dateFilter === f
                      ? 'bg-(--color-primary) text-white border-(--color-primary)'
                      : 'bg-(--color-muted) text-(--color-muted-foreground) border-(--color-border) hover:bg-(--color-border)'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="w-full overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Cliente</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Servicio</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Fecha / Hora</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Precio</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Estado</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className={`border-b border-(--color-border) last:border-0 ${a.status === 'cancelado' ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-4 text-[15px] text-(--color-foreground) font-medium">
                    <div className="font-semibold">{a.clientName}</div>
                    <div className="flex items-center gap-1 text-xs text-(--color-muted-foreground) mt-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                      {a.clientPhone}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[15px] text-(--color-foreground) font-medium">
                    <div className="font-semibold">{a.service}</div>
                    <div className="text-xs text-(--color-muted-foreground) mt-0.5">{a.duration} min</div>
                  </td>
                  <td className="px-5 py-4 text-[15px] text-(--color-foreground) font-semibold">
                    {new Date(a.date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })} {a.time}
                  </td>
                  <td className="px-5 py-4 text-[15px] text-(--color-foreground) font-semibold">{BUSINESS.currency}{a.price.toLocaleString()}</td>
                  <td className="px-5 py-4">{getStatusBadge(a.status)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={a.status}
                        onChange={(e) => handleStatusChange(a.id, e.target.value)}
                        className="px-2 py-1 text-xs rounded-md border border-(--color-border) bg-(--color-muted) text-(--color-foreground) cursor-pointer focus:outline-none"
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="completado">Completado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                      <button
                        type="button"
                        className="px-3 py-1 text-xs rounded-md border border-(--color-border) bg-(--color-muted) text-(--color-foreground) hover:bg-(--color-border) transition-colors cursor-pointer"
                        onClick={() => openEdit(a)}
                      >Editar</button>
                      <button
                        type="button"
                        className="px-3 py-1 text-xs rounded-md bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                        onClick={() => handleDelete(a.id)}
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
        <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="modal-card modal-md bg-(--color-card) rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl border border-(--color-border)">
            <h2 className="text-xl font-bold text-(--color-foreground) mb-4 mt-0">Agendar Nueva Cita</h2>
            <form onSubmit={handleSubmit} className="form-group flex flex-col gap-3">
              {/* Patient Group */}
              <div className="bg-(--color-muted) rounded-xl p-4">
                <label className="block text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider mb-3">Información del Paciente</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input required name="clientName" placeholder="Nombre completo" value={formData.clientName} onChange={handleInputChange} className={`flex-1 ${inputClass}`} />
                  <input required name="clientPhone" placeholder="Teléfono" value={formData.clientPhone} onChange={handleInputChange} className={`flex-1 ${inputClass}`} />
                </div>
              </div>

              {/* Service Details */}
              <div className="border border-(--color-border) rounded-xl p-4">
                <label className="block text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider mb-3">Detalles del Servicio</label>
                <select required name="service" value={formData.service} onChange={handleInputChange} className={`${inputClass} mb-3`}>
                  <option value="">Tipo de Masaje...</option>
                  {Object.keys(BUSINESS.services).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-(--color-muted-foreground) mb-1">Duración (min)</label>
                    <input required name="duration" type="number" placeholder="Duración (min)" value={formData.duration} onChange={handleInputChange} className={inputClass} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-(--color-muted-foreground) mb-1">Precio ($)</label>
                    <input required name="price" type="number" value={formData.price || ''} onChange={handleInputChange} className={inputClass} placeholder="Precio ($)" />
                  </div>
                </div>
              </div>

              {/* Date/Time Group */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Programación</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-(--color-muted-foreground) mb-1">Fecha</label>
                    <input required name="date" type="date" value={formData.date} onChange={handleInputChange} className={inputClass} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-(--color-muted-foreground) mb-1">Hora</label>
                    <input required name="time" type="time" value={formData.time} onChange={handleInputChange} className={inputClass} />
                  </div>
                </div>
              </div>

              <input name="notes" placeholder="Notas adicionales (opcional)..." value={formData.notes} onChange={handleInputChange} className={inputClass} />

              {conflictError && (
                <p className="text-sm text-(--color-destructive) bg-red-50 border border-red-100 rounded-md px-3 py-2">{conflictError}</p>
              )}

              <div className="form-actions flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => { setIsModalOpen(false); setConflictError(''); }} className="px-4 py-2 rounded-md font-semibold text-sm text-(--color-muted-foreground) hover:bg-(--color-muted) transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-(--color-primary) text-white font-semibold hover:bg-(--color-accent) transition-all disabled:opacity-60">
                  {submitting ? 'Agendando...' : 'Agendar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editTarget !== null && (
        <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="modal-card modal-md bg-(--color-card) rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl border border-(--color-border)">
            <h2 className="text-xl font-bold text-(--color-foreground) mb-4 mt-0">Editar Cita</h2>
            <form onSubmit={handleEditSubmit} className="form-group flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input required name="clientName" placeholder="Nombre completo" value={formData.clientName} onChange={handleInputChange} className={`flex-1 ${inputClass}`} />
                <input required name="clientPhone" placeholder="Teléfono" value={formData.clientPhone} onChange={handleInputChange} className={`flex-1 ${inputClass}`} />
              </div>

              <select required name="service" value={formData.service} onChange={handleInputChange} className={inputClass}>
                <option value="">Tipo de Masaje...</option>
                {Object.keys(BUSINESS.services).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <div className="flex flex-col sm:flex-row gap-3">
                <input required name="duration" type="number" placeholder="Duración (min)" value={formData.duration} onChange={handleInputChange} className={`flex-1 ${inputClass}`} />
                <input required name="price" type="number" placeholder="Precio ($)" value={formData.price || ''} onChange={handleInputChange} className={`flex-1 ${inputClass}`} />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input required name="date" type="date" value={formData.date} onChange={handleInputChange} className={`flex-1 ${inputClass}`} />
                <input required name="time" type="time" value={formData.time} onChange={handleInputChange} className={`flex-1 ${inputClass}`} />
              </div>

              <input name="notes" placeholder="Notas (opcional)..." value={formData.notes} onChange={handleInputChange} className={inputClass} />

              {conflictError && (
                <p className="text-sm text-(--color-destructive) bg-red-50 border border-red-100 rounded-md px-3 py-2">{conflictError}</p>
              )}

              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => { setEditTarget(null); setConflictError(''); }} className="px-4 py-2 rounded-md font-semibold text-sm text-(--color-muted-foreground) hover:bg-(--color-muted) transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-(--color-primary) text-white font-semibold hover:bg-(--color-accent) transition-all disabled:opacity-60">
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
