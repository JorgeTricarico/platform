import { useEffect, useState, useMemo, useCallback, type FormEvent } from 'react';
import { Search, Plus, Pencil, Trash2, User, ChevronRight, X, Phone } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';
import type { Client, Order, Appointment, PatientRecord } from '@platform/types';
import type { TenantConfig } from '@platform/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClientsProps {
  tenant: TenantConfig;
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface ClientForm {
  name: string;
  phone: string;
  altPhone: string;
}

function emptyForm(): ClientForm {
  return { name: '', phone: '', altPhone: '' };
}

// ─── Client history modal ─────────────────────────────────────────────────────

interface HistoryModalProps {
  client: Client;
  tenant: TenantConfig;
  onClose: () => void;
}

function ClientHistoryModal({ client, tenant, onClose }: HistoryModalProps) {
  const api = useApi();
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (tenant.features.orders) {
          const all = await api.orders.list();
          setOrders(all.filter((o) => o.clientName === client.name || o.clientPhone === client.phone));
        }
        if (tenant.features.appointments) {
          const all = await api.appointments.list();
          setAppointments(all.filter((a) => a.clientName === client.name || a.clientPhone === client.phone));
        }
        if (tenant.features.patientRecords) {
          const recs = await api.patientRecords.list(client.id);
          setRecords(recs);
        }
      } catch {
        toast.error('Error al cargar historial');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [client.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-card rounded-2xl border shadow-xl w-full"
        style={{ maxWidth: 'min(600px, 95vw)', maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-semibold">{client.name}</h2>
            <p className="text-xs text-muted-foreground">{client.phone}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* Orders */}
              {tenant.features.orders && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Órdenes ({orders.length})
                  </h3>
                  {orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin órdenes</p>
                  ) : (
                    <div className="space-y-1.5">
                      {orders.slice(0, 5).map((o) => (
                        <div key={o.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                          <span className="text-xs font-mono text-muted-foreground w-10">#{o.orderNumber}</span>
                          <span className="flex-1 text-sm truncate">{o.garmentName}</span>
                          <span className="text-xs capitalize text-muted-foreground">{o.status}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(o.intakeDate)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Appointments */}
              {tenant.features.appointments && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Turnos ({appointments.length})
                  </h3>
                  {appointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin turnos</p>
                  ) : (
                    <div className="space-y-1.5">
                      {appointments.slice(0, 5).map((a) => (
                        <div key={a.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                          <span className="flex-1 text-sm capitalize truncate">{a.service}</span>
                          <span className="text-xs text-muted-foreground">{a.time}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(a.date)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Patient records */}
              {tenant.features.patientRecords && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Fichas clínicas ({records.length})
                  </h3>
                  {records.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin fichas</p>
                  ) : (
                    <div className="space-y-1.5">
                      {records.slice(0, 5).map((r) => (
                        <div key={r.id} className="rounded-lg bg-muted/40 px-3 py-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{r.reason}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(r.date)}</span>
                          </div>
                          {r.observations && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{r.observations}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {!tenant.features.orders && !tenant.features.appointments && !tenant.features.patientRecords && (
                <p className="text-sm text-muted-foreground text-center py-4">No hay historial disponible</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Edit / Create Modal ──────────────────────────────────────────────────────

interface ClientModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  form: ClientForm;
  onChange: (field: keyof ClientForm, value: string) => void;
  submitting: boolean;
}

function ClientModal({ title, onClose, onSubmit, form, onChange, submitting }: ClientModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card rounded-2xl border shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-base">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Nombre *</label>
            <input
              required
              autoFocus
              value={form.name}
              onChange={(e) => onChange('name', e.target.value)}
              placeholder="Nombre completo"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Teléfono</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => onChange('phone', e.target.value)}
              placeholder="11-1234-5678"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Teléfono alternativo</label>
            <input
              type="tel"
              value={form.altPhone}
              onChange={(e) => onChange('altPhone', e.target.value)}
              placeholder="Opcional"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Clients({ tenant }: ClientsProps) {
  const api = useApi();
  const toast = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ClientForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [editForm, setEditForm] = useState<ClientForm>(emptyForm());

  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.clients.list();
      setClients(data);
    } catch {
      toast.error('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  }, [api, toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.phone && c.phone.includes(term)),
    );
  }, [clients, searchTerm]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.clients.create({ ...createForm, business: tenant.slug });
      toast.success('Cliente creado');
      setIsCreateOpen(false);
      setCreateForm(emptyForm());
      await load();
    } catch {
      toast.error('Error al crear el cliente');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await api.clients.update(editTarget.id, { name: editForm.name, phone: editForm.phone, altPhone: editForm.altPhone });
      toast.success('Cliente actualizado');
      setEditTarget(null);
      await load();
    } catch {
      toast.error('Error al actualizar el cliente');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.clients.delete(confirmDelete.id);
      toast.success('Cliente eliminado');
      setConfirmDelete(null);
      await load();
    } catch {
      toast.error('Error al eliminar el cliente');
    }
  };

  const openEdit = (c: Client) => {
    setEditTarget(c);
    setEditForm({ name: c.name, phone: c.phone, altPhone: c.altPhone ?? '' });
  };

  const updateField =
    (setter: React.Dispatch<React.SetStateAction<ClientForm>>) =>
    (field: keyof ClientForm, value: string) =>
      setter((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="text-lg font-semibold">Clientes</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} clientes</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo cliente</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre o teléfono…"
          className="w-full rounded-lg border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No se encontraron clientes</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Alt. teléfono</th>
                  <th>Desde</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => setHistoryClient(c)}
                  >
                    <td className="font-medium">{c.name}</td>
                    <td className="text-sm text-muted-foreground">{c.phone || '—'}</td>
                    <td className="text-sm text-muted-foreground">{c.altPhone || '—'}</td>
                    <td className="text-sm text-muted-foreground">{formatDate(c.createdAt)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {c.phone && (
                          <a
                            href={`https://wa.me/54${c.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 transition-colors text-muted-foreground"
                            title="WhatsApp"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors text-muted-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDelete(c)} className="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors text-muted-foreground">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setHistoryClient(c)} className="p-1.5 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors text-muted-foreground">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border bg-card p-3 flex items-center gap-3"
                onClick={() => setHistoryClient(c)}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                  style={{ backgroundColor: `hsl(${tenant.theme.primaryHsl})` }}
                >
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors text-muted-foreground">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmDelete(c)} className="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors text-muted-foreground">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground mt-1.5" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      {isCreateOpen && (
        <ClientModal
          title="Nuevo cliente"
          onClose={() => { setIsCreateOpen(false); setCreateForm(emptyForm()); }}
          onSubmit={handleCreate}
          form={createForm}
          onChange={updateField(setCreateForm)}
          submitting={submitting}
        />
      )}

      {editTarget && (
        <ClientModal
          title="Editar cliente"
          onClose={() => setEditTarget(null)}
          onSubmit={handleEdit}
          form={editForm}
          onChange={updateField(setEditForm)}
          submitting={submitting}
        />
      )}

      {historyClient && (
        <ClientHistoryModal
          client={historyClient}
          tenant={tenant}
          onClose={() => setHistoryClient(null)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-2">Eliminar cliente</h3>
            <p className="text-sm text-muted-foreground mb-5">
              ¿Seguro que querés eliminar a <strong>{confirmDelete.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg border py-2.5 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors">
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
