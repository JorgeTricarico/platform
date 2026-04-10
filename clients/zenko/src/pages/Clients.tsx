import { useEffect, useState } from 'react';
import { fetchClients, searchClients, createClient, updateClient, deleteClient, fetchClientOrders } from '../services/api';
import type { DBClient, DBGarment, ClientOrdersResponse } from '../services/api';
import { useToast } from '../components/ToastContext';

const EMPTY_FORM = { name: '', phone: '', altPhone: '', email: '', notes: '' };

export default function Clients() {
  const toast = useToast();
  const [clients, setClients] = useState<DBClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });
  const [editTarget, setEditTarget] = useState<DBClient | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [historialTarget, setHistorialTarget] = useState<DBClient | null>(null);
  const [clientOrders, setClientOrders] = useState<ClientOrdersResponse | null>(null);

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
      toast.success('Cliente registrado correctamente');
      setIsCreateOpen(false);
      setCreateForm({ ...EMPTY_FORM });
      load();
    } catch { toast.error('Error al registrar cliente'); }
  };

  const openEdit = (c: DBClient) => {
    setEditTarget(c);
    setEditForm({ name: c.name, phone: c.phone, altPhone: c.altPhone || '', email: c.email || '', notes: c.notes || '' });
  };

  const openHistorial = async (c: DBClient) => {
    setHistorialTarget(c);
    setClientOrders(null);
    try {
      const data = await fetchClientOrders(c.id);
      setClientOrders(data);
    } catch { toast.error('Error al cargar historial'); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      await updateClient(editTarget.id, editForm);
      toast.success('Cliente actualizado correctamente');
      setEditTarget(null);
      load();
    } catch { toast.error('Error al actualizar cliente'); }
  };

  const handleDelete = async (c: DBClient) => {
    if (!confirm(`¿Eliminar a ${c.name}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteClient(c.id);
      toast.success('Cliente eliminado');
      load();
    } catch { toast.error('Error al eliminar cliente'); }
  };

  if (loading && clients.length === 0) return <div>Cargando clientes...</div>;

  return (
    <div className="clients-page clients-page-full">
      <div className="flex-between clients-header">
        <div>
          <h1>Clientes</h1>
          <p className="subtitle clients-subtitle">Base de datos de clientes de Zenko.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>+ Nuevo Cliente</button>
      </div>

      <div className="card clients-table-card clients-table-card-full">
        <div className="clients-search-bar clients-search-bar-shrink">
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
                <th>Email</th>
                <th>Notas</th>
                <th>Registrado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id}>
                  <td className="clients-td-name clients-td-name-upper">{c.name}</td>
                  <td>
                    <div className="clients-phone-row">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                      {c.phone}
                    </div>
                    {c.altPhone && <div className="clients-td-secondary clients-phone-row">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      {c.altPhone}
                    </div>}
                  </td>
                  <td className={c.email ? '' : 'clients-td-muted'}>{c.email || '-'}</td>
                  <td className={`clients-td-notes ${c.notes ? '' : 'clients-td-muted'}`}>{c.notes || '-'}</td>
                  <td className="clients-td-secondary">{new Date(c.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  <td>
                    <div className="clients-actions-row clients-actions-row-sm">
                      <button
                        className="btn btn-small clients-btn-edit"
                        onClick={() => openEdit(c)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-small clients-btn-historial"
                        onClick={() => openHistorial(c)}
                      >
                        Ver historial
                      </button>
                      <button
                        className="btn btn-small clients-btn-delete"
                        onClick={() => handleDelete(c)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={6} className="clients-td-empty">
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

      {historialTarget && (
        <div className="modal-overlay">
          <div className="card modal-card modal-lg">
            <div className="clients-history-modal-header">
              <h2 className="clients-modal-h2">Historial — {historialTarget.name}</h2>
              <button className="btn-secondary" onClick={() => setHistorialTarget(null)}>Cerrar</button>
            </div>
            {clientOrders === null ? (
              <p>Cargando historial...</p>
            ) : (
              <>
                <p className="clients-historial-summary">
                  {clientOrders.summary.totalOrders} órdenes en total
                </p>
                {clientOrders.orders.length === 0 ? (
                  <p className="clients-td-muted">Sin órdenes registradas.</p>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Prenda</th>
                          <th>Ingreso</th>
                          <th>Entrega</th>
                          <th>Estado</th>
                          <th>Precio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientOrders.orders.map((o: DBGarment) => (
                          <tr key={o.id}>
                            <td className="clients-td-name">{o.garmentName} ({o.repairType})</td>
                            <td className="clients-td-sm">{o.intakeDate ? new Date(o.intakeDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</td>
                            <td className="clients-td-sm">{o.deliveryDate ? new Date(o.deliveryDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</td>
                            <td>{o.status}</td>
                            <td>${o.price.toLocaleString('es-AR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
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
          {/* Contact Details Group */}
          <div className="clients-modal-section">
            <label className="clients-modal-section-label clients-modal-section-label-lg">Datos de Contacto</label>
            <div className="form-group clients-modal-fields">
              <input required name="name" placeholder="Nombre completo" value={form.name} onChange={handle} className="input" />
              <div className="form-row">
                <input required name="phone" placeholder="Teléfono principal" value={form.phone} onChange={handle} disabled={phoneDisabled} className="input clients-input-flex" style={{ opacity: phoneDisabled ? 0.6 : 1 }} />
                <input name="altPhone" placeholder="Tel. alternativo" value={form.altPhone} onChange={handle} className="input clients-input-flex" />
              </div>
              <input name="email" type="email" placeholder="Email (opcional)" value={form.email} onChange={handle} className="input" />
            </div>
          </div>

          {/* Info Group */}
          <div className="clients-modal-section clients-modal-section-border">
            <label className="clients-modal-section-label">Información Adicional</label>
            <textarea name="notes" placeholder="Notas sobre el cliente, preferencias, etc..." value={form.notes} onChange={handle} rows={3} className="input clients-textarea" />
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
