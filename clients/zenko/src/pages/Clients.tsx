import { useEffect, useState } from 'react';
import { fetchClients, searchClients, createClient } from '../services/api';
import type { DBClient } from '../services/api';

const EMPTY_FORM = { name: '', phone: '', altPhone: '', email: '', notes: '' };

export default function Clients() {
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
      load();
    } catch { alert('Error al registrar cliente'); }
  };

  const openEdit = (c: DBClient) => {
    setEditTarget(c);
    setEditForm({ name: c.name, phone: c.phone, altPhone: c.altPhone || '', email: c.email || '', notes: c.notes || '' });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      await createClient({ ...editForm }); // upsert by phone
      setEditTarget(null);
      load();
    } catch { alert('Error al actualizar cliente'); }
  };

  if (loading && clients.length === 0) return <div>Cargando clientes...</div>;

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1>Clientes</h1>
          <p className="subtitle">Base de datos de clientes de Zenko.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>+ Nuevo Cliente</button>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px' }}>
          <input
            type="text"
            placeholder="Buscar por nombre, telefono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', width: '320px', outline: 'none', fontFamily: 'inherit', fontSize: '14px' }}
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
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{new Date(c.createdAt).toLocaleDateString('es-AR')}</td>
                  <td>
                    <button
                      className="btn"
                      style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }}
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
  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ width: '480px', padding: '32px' }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input required name="name" placeholder="Nombre completo" value={form.name} onChange={handle} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          <div style={{ display: 'flex', gap: '12px' }}>
            <input required name="phone" placeholder="Telefono principal" value={form.phone} onChange={handle} disabled={phoneDisabled} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', opacity: phoneDisabled ? 0.6 : 1 }} />
            <input name="altPhone" placeholder="Tel. alternativo" value={form.altPhone} onChange={handle} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <input name="email" type="email" placeholder="Email (opcional)" value={form.email} onChange={handle} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          <textarea name="notes" placeholder="Notas (opcional)" value={form.notes} onChange={handle} rows={3} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'inherit', resize: 'vertical' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
