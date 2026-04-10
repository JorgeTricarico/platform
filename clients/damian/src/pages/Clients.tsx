import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchClients, searchClients, createClient, updateClient, fetchClientHistory } from '../services/api';
import type { DBClient, ClientHistoryResponse } from '../services/api';
import { useToast } from '../components/ToastContext';

const EMPTY_FORM = { name: '', phone: '', altPhone: '' };

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

  if (loading && clients.length === 0) return <div>Cargando clientes...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="flex-between" style={{ marginBottom: '20px', flexShrink: 0 }}>
        <div>
          <h1>Clientes</h1>
          <p className="subtitle" style={{ margin: 0, fontSize: '14px' }}>Base de datos de clientes de Damian.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>+ Nuevo Cliente</button>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px' }}>
          <input
            type="text"
            placeholder="Buscar por nombre, telefono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-search"
          />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Telefono</th>
                <th>Registrado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>
                    <div>{c.phone}</div>
                    {c.altPhone && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{c.altPhone}</div>}
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{new Date(c.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-primary btn-small"
                        onClick={() => createRecord(c)}
                      >
                        Crear Ficha
                      </button>
                      <button
                        className="btn btn-small"
                        style={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)' }}
                        onClick={() => openEdit(c)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-small"
                        style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }}
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
                  <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
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
        <div className="modal-overlay">
          <div className="card modal-card modal-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'sticky', top: 0, backgroundColor: 'var(--surface-color)', zIndex: 1, paddingBottom: '12px' }}>
              <h2 style={{ margin: 0 }}>Historial de {historyTarget.name}</h2>
              <button className="btn-secondary" onClick={() => setHistoryTarget(null)}>Cerrar</button>
            </div>

            {!history ? (
              <p>Cargando historial...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div className="card glass-card" style={{ flex: 1, padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800 }}>{history.summary.totalAppointments}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Citas Totales</div>
                  </div>
                  <div className="card glass-card" style={{ flex: 1, padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800 }}>{history.summary.totalRecords}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Fichas Clínicas</div>
                  </div>
                </div>

                <section>
                  <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Citas y Turnos</h3>
                  {history.appointments.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No hay citas registradas.</p>
                  ) : (
                    <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <table style={{ fontSize: '14px' }}>
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Servicio</th>
                            <th>Precio</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.appointments.map(a => (
                            <tr key={a.id}>
                              <td>{new Date(a.date + 'T00:00:00').toLocaleDateString('es-AR')} {a.time}</td>
                              <td>{a.service}</td>
                              <td>${a.price.toLocaleString()}</td>
                              <td><span className={`badge ${a.status === 'completado' ? 'completed' : a.status === 'cancelado' ? 'urgent' : 'pending'}`}>{a.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section>
                  <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Fichas Clínicas</h3>
                  {history.records.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No hay fichas registradas.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {history.records.map(r => (
                        <div key={r.id} className="card" style={{ padding: '16px', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontWeight: 700, marginBottom: '4px' }}>{new Date(r.date + 'T00:00:00').toLocaleDateString('es-AR')}</div>
                          <div style={{ fontWeight: 600, color: 'var(--primary-color)', fontSize: '14px' }}>{r.reason}</div>
                          {r.treatment && <div style={{ fontSize: '13px', marginTop: '8px' }}><strong>Tratamiento:</strong> {r.treatment}</div>}
                          {r.observations && <div style={{ fontSize: '13px', marginTop: '4px', fontStyle: 'italic' }}>"{r.observations}"</div>}
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
    <div className="modal-overlay">
      <div className="card modal-card modal-md">
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <form onSubmit={handleSubmit} className="form-group">
          {/* Identity & Contact Group */}
          <div style={{ padding: '16px', backgroundColor: 'var(--surface-secondary)', borderRadius: '12px', marginBottom: '24px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#666', marginBottom: '8px', display: 'block' }}>Identidad y Contacto</label>
            <div className="form-group" style={{ gap: '12px' }}>
              <input required name="name" placeholder="Nombre completo" value={form.name} onChange={handle} className="input" />
              <div className="form-row">
                <input required name="phone" placeholder="Teléfono principal" value={form.phone} onChange={handle} disabled={phoneDisabled} className="input" style={{ flex: 1, opacity: phoneDisabled ? 0.6 : 1 }} />
                <input name="altPhone" placeholder="Tel. alternativo" value={form.altPhone} onChange={handle} className="input" style={{ flex: 1 }} />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
