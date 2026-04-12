import { useEffect, useState, useMemo, useCallback, type FormEvent } from 'react';
import { Search, Plus, Pencil, Trash2, MessageCircle, Calendar, List, X } from 'lucide-react';
import { cn, formatCurrency, formatDate, formatDateLong, today } from '../lib/utils';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';
import type { Appointment, AppointmentStatus } from '@platform/types';
import type { TenantConfig } from '@platform/config';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppointmentsProps {
  tenant: TenantConfig;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pendiente:  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  confirmado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completado: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelado:  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full',
        STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </span>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface AppointmentForm {
  clientName: string;
  clientPhone: string;
  service: string;
  duration: string;
  date: string;
  time: string;
  price: string;
  notes: string;
  status: AppointmentStatus;
}

function emptyForm(): AppointmentForm {
  return {
    clientName: '',
    clientPhone: '',
    service: '',
    duration: '60',
    date: today(),
    time: '',
    price: '0',
    notes: '',
    status: 'pendiente',
  };
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  form: AppointmentForm;
  onChange: (field: keyof AppointmentForm, value: string) => void;
  tenant: TenantConfig;
  submitting: boolean;
  conflictError?: string;
}

function AppointmentModal({ title, onClose, onSubmit, form, onChange, tenant, submitting, conflictError }: ModalProps) {
  const statusLabel = (s: string) => tenant.statuses.find((st) => st.key === s)?.label ?? s;

  const handleServiceChange = (service: string) => {
    onChange('service', service);
    // Auto-fill price/duration from tenant services catalog
    const found = tenant.services?.find?.((s: { id?: string; name?: string }) =>
      s.id === service || s.name === service
    );
    if (found) {
      if ('defaultPrice' in found) onChange('price', String(found.defaultPrice));
      if ('duration' in found && found.duration) onChange('duration', String(found.duration));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-card rounded-2xl border shadow-xl w-full"
        style={{ maxWidth: 'min(520px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-base">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Nombre cliente *</label>
              <input
                required
                value={form.clientName}
                onChange={(e) => onChange('clientName', e.target.value)}
                placeholder="Nombre"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Teléfono</label>
              <input
                value={form.clientPhone}
                onChange={(e) => onChange('clientPhone', e.target.value)}
                placeholder="11-1234-5678"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Servicio *</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tenant.serviceTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleServiceChange(t)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize',
                    form.service === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              value={tenant.serviceTypes.includes(form.service) ? '' : form.service}
              onChange={(e) => onChange('service', e.target.value)}
              placeholder="Otro servicio…"
              className="w-full rounded-lg border border-dashed bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Fecha *</label>
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => onChange('date', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Hora *</label>
              <input
                required
                type="time"
                value={form.time}
                onChange={(e) => onChange('time', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Duración (min)</label>
              <input
                type="number"
                min="15"
                step="15"
                value={form.duration}
                onChange={(e) => onChange('duration', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Precio</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => onChange('price', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Estado</label>
              <select
                value={form.status}
                onChange={(e) => onChange('status', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {tenant.statuses.map(({ key, label }) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => onChange('notes', e.target.value)}
              rows={2}
              placeholder="Observaciones, indicaciones…"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {conflictError && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 dark:bg-red-950/50 rounded-lg px-3 py-2">
              {conflictError}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {submitting ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Date filter options ──────────────────────────────────────────────────────

type DateFilter = 'todos' | 'hoy' | 'semana' | 'proximas' | 'historial';

// ─── Main component ───────────────────────────────────────────────────────────

export default function Appointments({ tenant }: AppointmentsProps) {
  const api = useApi();
  const toast = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('todos');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<AppointmentForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState('');

  const [editTarget, setEditTarget] = useState<Appointment | null>(null);
  const [editForm, setEditForm] = useState<AppointmentForm>(emptyForm());

  const [confirmDelete, setConfirmDelete] = useState<Appointment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.appointments.list();
      setAppointments(data);
    } catch {
      toast.error('Error al cargar los turnos');
    } finally {
      setLoading(false);
    }
  }, [api, toast]);

  useEffect(() => { load(); }, [load]);

  // ─── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const now = new Date();
    const todayStr = today();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    return appointments.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (dateFilter === 'hoy' && a.date !== todayStr) return false;
      if (dateFilter === 'semana' && (a.date < todayStr || a.date > weekEndStr)) return false;
      if (dateFilter === 'proximas' && a.date < todayStr) return false;
      if (dateFilter === 'historial' && a.date >= todayStr) return false;
      if (term && !a.clientName.toLowerCase().includes(term) && !a.service.toLowerCase().includes(term)) return false;
      return true;
    }).sort((a, b) => {
      const da = `${a.date}T${a.time}`;
      const db = `${b.date}T${b.time}`;
      return dateFilter === 'historial'
        ? db.localeCompare(da)
        : da.localeCompare(db);
    });
  }, [appointments, searchTerm, statusFilter, dateFilter]);

  // Group by date for calendar-like view
  const byDate = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};
    for (const a of filtered) {
      groups[a.date] = groups[a.date] ?? [];
      groups[a.date].push(a);
    }
    return groups;
  }, [filtered]);

  // ─── CRUD ───────────────────────────────────────────────────────────────────
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setConflictError('');
    setSubmitting(true);
    try {
      await api.appointments.create({
        ...createForm,
        duration: Number(createForm.duration),
        price: Number(createForm.price),
        location: '',
      });
      toast.success('Turno creado correctamente');
      setIsCreateOpen(false);
      setCreateForm(emptyForm());
      await load();
    } catch (err) {
      const apiErr = err as { status?: number; message?: string };
      if (apiErr?.status === 409) {
        setConflictError(apiErr.message ?? 'Conflicto de horario: ya existe un turno en ese horario.');
      } else {
        toast.error('Error al crear el turno');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setConflictError('');
    setSubmitting(true);
    try {
      await api.appointments.update(editTarget.id, {
        ...editForm,
        duration: Number(editForm.duration),
        price: Number(editForm.price),
      });
      toast.success('Turno actualizado');
      setEditTarget(null);
      await load();
    } catch (err) {
      const apiErr = err as { status?: number; message?: string };
      if (apiErr?.status === 409) {
        setConflictError(apiErr.message ?? 'Conflicto de horario.');
      } else {
        toast.error('Error al actualizar el turno');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.appointments.delete(confirmDelete.id);
      toast.success('Turno eliminado');
      setConfirmDelete(null);
      await load();
    } catch {
      toast.error('Error al eliminar el turno');
    }
  };

  const openEdit = (appt: Appointment) => {
    setEditTarget(appt);
    setConflictError('');
    setEditForm({
      clientName: appt.clientName,
      clientPhone: appt.clientPhone,
      service: appt.service,
      duration: String(appt.duration),
      date: appt.date,
      time: appt.time,
      price: String(appt.price),
      notes: appt.notes ?? '',
      status: appt.status,
    });
  };

  const handleWhatsApp = (appt: Appointment) => {
    const msg = tenant.whatsappTemplates.ready(appt.clientName, appt.service);
    const phone = appt.clientPhone.replace(/\D/g, '');
    window.open(`https://wa.me/54${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const updateField =
    (setter: React.Dispatch<React.SetStateAction<AppointmentForm>>) =>
    (field: keyof AppointmentForm, value: string) =>
      setter((prev) => ({ ...prev, [field]: value }));

  const statusLabel = (status: string) =>
    tenant.statuses.find((s) => s.key === status)?.label ?? status;

  const DATE_FILTERS: Array<{ key: DateFilter; label: string }> = [
    { key: 'todos', label: 'Todos' },
    { key: 'hoy', label: 'Hoy' },
    { key: 'semana', label: 'Esta semana' },
    { key: 'proximas', label: 'Próximas' },
    { key: 'historial', label: 'Historial' },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="text-lg font-semibold">Turnos y citas</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'turno' : 'turnos'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-2 text-sm transition-colors', viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
              title="Vista lista"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn('p-2 text-sm transition-colors', viewMode === 'calendar' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
              title="Vista calendario"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo turno</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="mb-4 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar cliente o servicio…"
            className="w-full rounded-lg border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {DATE_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDateFilter(key)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                dateFilter === key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No se encontraron turnos</p>
        </div>
      ) : viewMode === 'calendar' ? (
        // Calendar grouped view
        <div className="space-y-4">
          {Object.entries(byDate).map(([date, appts]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                {formatDateLong(date)}
              </h3>
              <div className="space-y-1.5">
                {appts.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                    <div className="text-center min-w-[48px]">
                      <p className="text-sm font-bold">{a.time}</p>
                      <p className="text-[10px] text-muted-foreground">{a.duration}m</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.clientName}</p>
                      <p className="text-xs text-muted-foreground capitalize truncate">{a.service}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={a.status} label={statusLabel(a.status)} />
                      <span className="text-sm font-medium">{formatCurrency(a.price, tenant.currency)}</span>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {tenant.features.whatsappNotifications && a.clientPhone && (
                        <button onClick={() => handleWhatsApp(a)} className="p-1.5 rounded-lg hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 transition-colors text-muted-foreground">
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(a)} className="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors text-muted-foreground">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List view
        <>
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Estado</th>
                  <th>Precio</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td className="text-sm">{formatDate(a.date)}</td>
                    <td className="font-medium">{a.time}</td>
                    <td>
                      <p className="font-medium">{a.clientName}</p>
                      <p className="text-xs text-muted-foreground">{a.clientPhone}</p>
                    </td>
                    <td className="capitalize">{a.service}</td>
                    <td><StatusBadge status={a.status} label={statusLabel(a.status)} /></td>
                    <td className="font-medium">{formatCurrency(a.price, tenant.currency)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {tenant.features.whatsappNotifications && a.clientPhone && (
                          <button onClick={() => handleWhatsApp(a)} className="p-1.5 rounded-lg hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 transition-colors text-muted-foreground">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDelete(a)} className="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors text-muted-foreground">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {filtered.map((a) => (
              <div key={a.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <p className="font-semibold text-sm">{a.clientName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{a.service}</p>
                  </div>
                  <StatusBadge status={a.status} label={statusLabel(a.status)} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(a.date)} · {a.time} ({a.duration}m)
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium mr-1">{formatCurrency(a.price, tenant.currency)}</span>
                    {tenant.features.whatsappNotifications && a.clientPhone && (
                      <button onClick={() => handleWhatsApp(a)} className="p-1.5 rounded-lg hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 transition-colors text-muted-foreground">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmDelete(a)} className="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors text-muted-foreground">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create modal */}
      {isCreateOpen && (
        <AppointmentModal
          title="Nuevo turno"
          onClose={() => { setIsCreateOpen(false); setCreateForm(emptyForm()); setConflictError(''); }}
          onSubmit={handleCreate}
          form={createForm}
          onChange={updateField(setCreateForm)}
          tenant={tenant}
          submitting={submitting}
          conflictError={conflictError}
        />
      )}

      {/* Edit modal */}
      {editTarget && (
        <AppointmentModal
          title="Editar turno"
          onClose={() => { setEditTarget(null); setConflictError(''); }}
          onSubmit={handleEdit}
          form={editForm}
          onChange={updateField(setEditForm)}
          tenant={tenant}
          submitting={submitting}
          conflictError={conflictError}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-2">Eliminar turno</h3>
            <p className="text-sm text-muted-foreground mb-5">
              ¿Seguro que querés eliminar el turno de <strong>{confirmDelete.clientName}</strong> del {formatDate(confirmDelete.date)}?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg border py-2.5 text-sm hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button onClick={handleDelete} className="flex-1 rounded-lg bg-destructive text-destructive-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
