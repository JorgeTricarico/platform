import { useEffect, useState } from 'react';
import { fetchClients, searchClients, createClient, updateClient } from '../services/api';
import type { DBClient } from '../services/api';
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
    setEditForm({ name: c.name, phone: c.phone, altPhone: c.altPhone || '', email: c.email || '', notes: c.notes || '' });
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
                <th>Email</th>
                <th>Notas</th>
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
                  <td style={{ color: c.email ? 'inherit' : 'var(--text-secondary)' }}>{c.email || '-'}</td>
                  <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: c.notes ? 'inherit' : 'var(--text-secondary)' }}>{c.notes || '-'}</td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{new Date(c.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  <td>
                    <button
                      className="btn btn-small"
                      onClick={() => openEdit(c)}
                    >
                      Editar
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
          <div style={{ padding: '16px', backgroundColor: 'var(--surface-secondary)', borderRadius: '12px', marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#666', marginBottom: '8px', display: 'block' }}>Identidad y Contacto</label>
            <div className="form-group" style={{ gap: '12px' }}>
              <input required name="name" placeholder="Nombre completo" value={form.name} onChange={handle} className="input" />
              <div className="form-row">
                <input required name="phone" placeholder="Teléfono principal" value={form.phone} onChange={handle} disabled={phoneDisabled} className="input" style={{ flex: 1, opacity: phoneDisabled ? 0.6 : 1 }} />
                <input name="altPhone" placeholder="Tel. alternativo" value={form.altPhone} onChange={handle} className="input" style={{ flex: 1 }} />
              </div>
              <input name="email" type="email" placeholder="Email (opcional)" value={form.email} onChange={handle} className="input" />
            </div>
          </div>

          <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#666', marginBottom: '8px', display: 'block' }}>Notas e Información Adicional</label>
            <textarea name="notes" placeholder="Notas sobre el paciente, antecedentes, etc..." value={form.notes} onChange={handle} rows={3} className="input" style={{ fontFamily: 'inherit', resize: 'vertical' }} />
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
