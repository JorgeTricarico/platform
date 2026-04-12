import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchClients, searchClients, createClient, updateClient, fetchClientHistory } from '../services/api';
import type { DBClient, ClientHistoryResponse } from '../services/api';
import { useToast } from '../components/ToastContext';
import { SkeletonLoader, Spinner } from '../components/SkeletonLoader';

const EMPTY_FORM = { name: '', phone: '', altPhone: '' };

const inputClass = "w-full px-3 py-2 rounded-md border border-(--color-border) bg-(--color-card) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50";

export default function Clients() {
  const toast = useToast();
  const navigate = useNavigate();
  const [clients, setClients] = useState<DBClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });
  const [editTarget, setEditTarget] = useState<DBClient | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [historyTarget, setHistoryTarget] = useState<DBClient | null>(null);
  const [history, setHistory] = useState<ClientHistoryResponse | null>(null);

  const load = () => {
    setLoading(true);
    fetchClients()
      .then(data => { setClients(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!searchTerm.trim()) { load(); return; }
    const timeout = setTimeout(() => {
      searchClients(searchTerm).then(setClients).catch(() => {});
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createClient(createForm);
      setIsCreateOpen(false);
      setCreateForm({ ...EMPTY_FORM });
      toast.success('Cliente registrado correctamente');
      load();
    } catch { toast.error('Error al registrar cliente'); }
  };

  const openEdit = (c: DBClient) => {
    setEditTarget(c);
    setEditForm({ name: c.name, phone: c.phone, altPhone: c.altPhone || '' });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      await updateClient(editTarget.id, editForm);
      setEditTarget(null);
      toast.success('Cliente actualizado correctamente');
      load();
    } catch { toast.error('Error al actualizar cliente'); }
  };

  const openHistory = async (c: DBClient) => {
    setHistoryTarget(c);
    setHistory(null);
    try {
      const data = await fetchClientHistory(c.id);
      setHistory(data);
    } catch {
      toast.error('Error al cargar historial');
    }
  };

  const createRecord = (c: DBClient) => {
    navigate(`/damian/patients?select=${c.id}&action=new_record`);
  };

  if (loading && clients.length === 0) return <SkeletonLoader rows={5} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1>Clientes</h1>
          <p className="subtitle" style={{ margin: 0 }}>Base de datos de clientes de Damian.</p>
        </div>
        <button
          className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-(--color-primary) text-white font-semibold text-[15px] hover:bg-(--color-accent) hover:shadow-md transition-all"
          onClick={() => setIsCreateOpen(true)}
        >
          + Nuevo Cliente
        </button>
      </div>

      <div className="bg-(--color-card) rounded-2xl shadow-sm border border-(--color-border) overflow-hidden">
        <div className="p-4 border-b border-(--color-border)">
          <input
            type="text"
            placeholder="Buscar por nombre, telefono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-(--color-border) bg-(--color-muted) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50 text-sm"
          />
        </div>
        <div className="w-full overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Nombre</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Telefono</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Registrado</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id} className="border-b border-(--color-border) last:border-0">
                  <td className="px-5 py-4 text-[15px] text-(--color-foreground) font-semibold">{c.name}</td>
                  <td className="px-5 py-4 text-[15px] text-(--color-foreground) font-medium">
                    <div>{c.phone}</div>
                    {c.altPhone && <div className="text-xs text-(--color-muted-foreground) mt-0.5">{c.altPhone}</div>}
                  </td>
                  <td className="px-5 py-4 text-sm text-(--color-muted-foreground)">{new Date(c.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-(--color-primary) text-white text-xs font-semibold hover:bg-(--color-accent) transition-all"
                        onClick={() => createRecord(c)}
                      >
                        Crear Ficha
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-md text-xs font-semibold border border-(--color-border) bg-(--color-muted) text-(--color-foreground) hover:bg-(--color-border) transition-colors"
                        onClick={() => openEdit(c)}
                      >
                        Editar
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-md text-xs font-semibold border border-(--color-border) bg-(--color-muted) text-(--color-muted-foreground) hover:bg-(--color-border) transition-colors"
                        onClick={() => openHistory(c)}
                      >
                        Ver Historial
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center px-5 py-8 text-(--color-muted-foreground) text-sm">
                    No se encontraron clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateOpen && (
        <ClientModal title="Nuevo Cliente" form={createForm} setForm={setCreateForm} onSubmit={handleCreate} onClose={() => { setIsCreateOpen(false); setCreateForm({ ...EMPTY_FORM }); }} />
      )}

      {editTarget && (
        <ClientModal title={`Editar: ${editTarget.name}`} form={editForm} setForm={setEditForm} onSubmit={handleEdit} onClose={() => setEditTarget(null)} phoneDisabled />
      )}

      {historyTarget && (
        <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-(--color-card) rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-(--color-border)">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-(--color-foreground) m-0">Historial de {historyTarget.name}</h2>
              <button
                className="px-4 py-2 rounded-md font-semibold text-sm text-(--color-muted-foreground) hover:bg-(--color-muted) transition-colors"
                onClick={() => setHistoryTarget(null)}
              >
                Cerrar
              </button>
            </div>

            {!history ? (
              <div className="flex justify-center p-4"><Spinner /></div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-(--color-muted) rounded-xl p-4 border border-(--color-border)">
                    <div className="text-2xl font-bold text-(--color-foreground)">{history.summary.totalAppointments}</div>
                    <div className="text-xs text-(--color-muted-foreground) mt-1">Citas Totales</div>
                  </div>
                  <div className="bg-(--color-muted) rounded-xl p-4 border border-(--color-border)">
                    <div className="text-2xl font-bold text-(--color-foreground)">{history.summary.totalRecords}</div>
                    <div className="text-xs text-(--color-muted-foreground) mt-1">Fichas Clínicas</div>
                  </div>
                </div>

                <section>
                  <h3 className="text-base font-bold text-(--color-foreground) mb-3">Citas y Turnos</h3>
                  {history.appointments.length === 0 ? (
                    <p className="text-sm text-(--color-muted-foreground) italic">No hay citas registradas.</p>
                  ) : (
                    <div className="w-full overflow-hidden rounded-xl border border-(--color-border)">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Fecha</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Servicio</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Precio</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.appointments.map(a => (
                            <tr key={a.id} className="border-b border-(--color-border) last:border-0">
                              <td className="px-4 py-3 text-sm text-(--color-foreground)">{new Date(a.date + 'T00:00:00').toLocaleDateString('es-AR')} {a.time}</td>
                              <td className="px-4 py-3 text-sm text-(--color-foreground)">{a.service}</td>
                              <td className="px-4 py-3 text-sm text-(--color-foreground)">${a.price.toLocaleString()}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                                  a.status === 'completado' ? 'bg-green-100 text-(--color-success)' :
                                  a.status === 'cancelado' ? 'bg-red-100 text-(--color-destructive)' :
                                  'bg-yellow-100 text-(--color-accent)'
                                }`}>{a.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="text-base font-bold text-(--color-foreground) mb-3">Fichas Clínicas</h3>
                  {history.records.length === 0 ? (
                    <p className="text-sm text-(--color-muted-foreground) italic">No hay fichas registradas.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {history.records.map(r => (
                        <div key={r.id} className="bg-(--color-card) rounded-xl p-4 border border-(--color-border) shadow-sm">
                          <div className="text-xs text-(--color-muted-foreground) mb-1">{new Date(r.date + 'T00:00:00').toLocaleDateString('es-AR')}</div>
                          <div className="font-semibold text-(--color-foreground)">{r.reason}</div>
                          {r.treatment && <div className="text-sm text-(--color-muted-foreground) mt-1">tratamiento: {r.treatment}</div>}
                          {r.observations && <div className="text-sm text-(--color-muted-foreground) mt-1 italic">"{r.observations}"</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type FormState = typeof EMPTY_FORM;

function ClientModal({ title, form, setForm, onSubmit, onClose, phoneDisabled }: {
  title: string;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onClose: () => void;
  phoneDisabled?: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    setSubmitting(true);
    try {
      await onSubmit(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="modal-card modal-md bg-(--color-card) rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl border border-(--color-border)">
        <h2 className="text-xl font-bold text-(--color-foreground) mb-4 mt-0">{title}</h2>
        <form onSubmit={handleSubmit} className="form-group flex flex-col gap-3">
          {/* Identity & Contact Group */}
          <div className="bg-(--color-muted) rounded-xl p-4">
            <label className="block text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider mb-3">Identidad y Contacto</label>
            <div className="flex flex-col gap-3">
              <input required name="name" placeholder="Nombre completo" value={form.name} onChange={handle} className={inputClass} />
              <div className="flex gap-3">
                <input required name="phone" placeholder="Teléfono principal" value={form.phone} onChange={handle} disabled={phoneDisabled} className={`flex-1 ${inputClass}`} style={{ opacity: phoneDisabled ? 0.6 : 1 }} />
                <input name="altPhone" placeholder="Tel. alternativo" value={form.altPhone} onChange={handle} className={`flex-1 ${inputClass}`} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md font-semibold text-sm text-(--color-muted-foreground) hover:bg-(--color-muted) transition-colors">Cancelar</button>
            <button type="submit" disabled={submitting} className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-(--color-primary) text-white font-semibold hover:bg-(--color-accent) transition-all disabled:opacity-60">
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
