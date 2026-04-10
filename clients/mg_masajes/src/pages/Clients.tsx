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
    <div className="clients-page">
      <div className="flex-between clients-header">
        <div>
          <h1>Clientes</h1>
          <p className="subtitle clients-subtitle">Base de datos de clientes de Damian.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>+ Nuevo Cliente</button>
      </div>

      <div className="card clients-table-card">
        <div className="clients-search-bar">
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
                  <td className="clients-td-name">{c.name}</td>
                  <td>
                    <div>{c.phone}</div>
                    {c.altPhone && <div className="clients-td-secondary">{c.altPhone}</div>}
                  </td>
                  <td className="clients-td-secondary">{new Date(c.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  <td>
                    <div className="clients-actions-row">
                      <button
                        className="btn btn-primary btn-small"
                        onClick={() => createRecord(c)}
                      >
                        Crear Ficha
                      </button>
                      <button
                        className="btn btn-small clients-btn-edit"
                        onClick={() => openEdit(c)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-small clients-btn-history"
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
                  <td colSpan={4} className="clients-td-empty">
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
          <div className="card modal-card modal-lg clients-history-modal">
            <div className="clients-history-modal-header">
              <h2 className="clients-modal-h2">Historial de {historyTarget.name}</h2>
              <button className="btn-secondary" onClick={() => setHistoryTarget(null)}>Cerrar</button>
            </div>

            {!history ? (
              <p>Cargando historial...</p>
            ) : (
              <div className="clients-history-body">
                <div className="clients-history-summary-row">
                  <div className="card glass-card clients-history-stat-card">
                    <div className="clients-history-stat-number">{history.summary.totalAppointments}</div>
                    <div className="clients-td-secondary">Citas Totales</div>
                  </div>
                  <div className="card glass-card clients-history-stat-card">
                    <div className="clients-history-stat-number">{history.summary.totalRecords}</div>
                    <div className="clients-td-secondary">Fichas Clínicas</div>
                  </div>
                </div>

                <section>
                  <h3 className="clients-section-heading">Citas y Turnos</h3>
                  {history.appointments.length === 0 ? (
                    <p className="clients-empty-text">No hay citas registradas.</p>
                  ) : (
                    <div className="table-container clients-history-table-wrap">
                      <table className="clients-history-table">
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
                  <h3 className="clients-section-heading">Fichas Clínicas</h3>
                  {history.records.length === 0 ? (
                    <p className="clients-empty-text">No hay fichas registradas.</p>
                  ) : (
                    <div className="clients-records-list">
                      {history.records.map(r => (
                        <div key={r.id} className="card clients-record-card">
                          <div className="clients-record-date">{new Date(r.date + 'T00:00:00').toLocaleDateString('es-AR')}</div>
                          <div className="clients-record-reason">{r.reason}</div>
                          {r.treatment && <div className="clients-record-detail">tratamiento: {r.treatment}</div>}
                          {r.observations && <div className="clients-record-observations">"{r.observations}"</div>}
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
        <h2 className="clients-modal-title">{title}</h2>
        <form onSubmit={handleSubmit} className="form-group">
          {/* Identity & Contact Group */}
          <div className="clients-modal-section">
            <label className="clients-modal-section-label">Identidad y Contacto</label>
            <div className="form-group clients-modal-fields">
              <input required name="name" placeholder="Nombre completo" value={form.name} onChange={handle} className="input" />
              <div className="form-row">
                <input required name="phone" placeholder="Teléfono principal" value={form.phone} onChange={handle} disabled={phoneDisabled} className="input clients-input-flex" style={{ opacity: phoneDisabled ? 0.6 : 1 }} />
                <input name="altPhone" placeholder="Tel. alternativo" value={form.altPhone} onChange={handle} className="input clients-input-flex" />
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
