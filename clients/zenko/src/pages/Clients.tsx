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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex-between" style={{ marginBottom: '20px', flexShrink: 0 }}>
        <div>
          <h1>Clientes</h1>
          <p className="subtitle" style={{ margin: 0, fontSize: '14px' }}>Base de datos de clientes de Zenko.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>+ Nuevo Cliente</button>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px', flexShrink: 0 }}>
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
                  <td style={{ fontWeight: 600, textTransform: 'uppercase' }}>{c.name}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                      {c.phone}
                    </div>
                    {c.altPhone && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      {c.altPhone}
                    </div>}
                  </td>
                  <td style={{ color: c.email ? 'inherit' : 'var(--text-secondary)' }}>{c.email || '-'}</td>
                  <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: c.notes ? 'inherit' : 'var(--text-secondary)' }}>{c.notes || '-'}</td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{new Date(c.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  <td style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-small"
                      style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }}
                      onClick={() => openEdit(c)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-small"
                      style={{ backgroundColor: '#f0f5ff', border: '1px solid #cce0ff', color: '#0055cc' }}
                      onClick={() => openHistorial(c)}
                    >
                      Ver historial
                    </button>
                    <button
                      className="btn btn-small"
                      style={{ backgroundColor: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000' }}
                      onClick={() => handleDelete(c)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0 }}>Historial — {historialTarget.name}</h2>
              <button className="btn-secondary" onClick={() => setHistorialTarget(null)}>Cerrar</button>
            </div>
            {clientOrders === null ? (
              <p>Cargando historial...</p>
            ) : (
              <>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  {clientOrders.summary.totalOrders} órdenes en total
                </p>
                {clientOrders.orders.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>Sin órdenes registradas.</p>
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
                            <td style={{ fontWeight: 600 }}>{o.garmentName} ({o.repairType})</td>
                            <td style={{ fontSize: '13px' }}>{o.intakeDate ? new Date(o.intakeDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</td>
                            <td style={{ fontSize: '13px' }}>{o.deliveryDate ? new Date(o.deliveryDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</td>
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
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <form onSubmit={handleSubmit} className="form-group">
          {/* Contact Details Group */}
          <div style={{ padding: '16px', backgroundColor: 'var(--surface-secondary)', borderRadius: '12px', marginBottom: '8px' }}>
            <label style={{ fontSize: '12px', color: '#666', marginBottom: '12px', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Datos de Contacto</label>
            <div className="form-group" style={{ gap: '12px' }}>
              <input required name="name" placeholder="Nombre completo" value={form.name} onChange={handle} className="input" />
              <div className="form-row">
                <input required name="phone" placeholder="Teléfono principal" value={form.phone} onChange={handle} disabled={phoneDisabled} className="input" style={{ flex: 1, opacity: phoneDisabled ? 0.6 : 1 }} />
                <input name="altPhone" placeholder="Tel. alternativo" value={form.altPhone} onChange={handle} className="input" style={{ flex: 1 }} />
              </div>
              <input name="email" type="email" placeholder="Email (opcional)" value={form.email} onChange={handle} className="input" />
            </div>
          </div>

          {/* Info Group */}
          <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <label style={{ fontSize: '12px', color: '#666', marginBottom: '8px', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Información Adicional</label>
            <textarea name="notes" placeholder="Notas sobre el cliente, preferencias, etc..." value={form.notes} onChange={handle} rows={3} className="input" style={{ fontFamily: 'inherit', resize: 'vertical' }} />
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
