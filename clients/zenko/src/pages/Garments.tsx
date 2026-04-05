import { useEffect, useState } from 'react';
import { fetchGarments, createGarment, updateGarment, deleteGarment } from '../services/api';
import type { DBGarment } from '../services/api';
import PhotoGallery from '../components/PhotoGallery';

const EMPTY_FORM = {
  clientName: '', clientPhone: '', garmentName: '', repairType: '',
  description: '', intakeDate: new Date().toISOString().split('T')[0], deliveryDate: '', price: 0, status: 'recibido'
};

export default function Garments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [garments, setGarments] = useState<DBGarment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal crear
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });

  // Modal editar
  const [editTarget, setEditTarget] = useState<DBGarment | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });

  const load = () => {
    setLoading(true);
    fetchGarments()
      .then(data => { setGarments(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = garments.filter(g =>
    g.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.garmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createGarment({ ...createForm, price: Number(createForm.price) });
      setIsCreateOpen(false);
      setCreateForm({ ...EMPTY_FORM });
      load();
    } catch {
      alert('Error al guardar la orden');
    }
  };

  const openEdit = (g: DBGarment) => {
    setEditTarget(g);
    setEditForm({
      clientName: g.clientName, clientPhone: g.clientPhone,
      garmentName: g.garmentName, repairType: g.repairType,
      description: g.description, intakeDate: g.intakeDate || '', deliveryDate: g.deliveryDate,
      price: g.price, status: g.status
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      await updateGarment(editTarget.id, { ...editForm, price: Number(editForm.price) });
      setEditTarget(null);
      load();
    } catch {
      alert('Error al actualizar la orden');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta orden? Esta acción no se puede deshacer.')) return;
    try {
      await deleteGarment(id);
      load();
    } catch {
      alert('Error al eliminar la orden');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'recibido': return <span className="badge pending">Recibido</span>;
      case 'en_proceso': return <span className="badge urgent">En Proceso</span>;
      case 'listo': return <span className="badge completed">Listo para Entrega</span>;
      case 'entregado': return <span className="badge">Entregado</span>;
      default: return null;
    }
  };

  if (loading && garments.length === 0) return <div>Cargando lista de prendas...</div>;

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1>Gestión de Prendas</h1>
          <p className="subtitle">Administra los arreglos de tus clientes detalladamente.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>+ Registrar Ingreso</button>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px' }}>
          <input
            type="text"
            placeholder="Buscar por cliente, prenda o nro orden..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', width: '320px', outline: 'none', fontFamily: 'inherit', fontSize: '14px' }}
          />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID Orden</th>
                <th>Cliente</th>
                <th>Prenda & Detalle</th>
                <th>Costo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => (
                <tr key={g.id}>
                  <td style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>#{g.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{g.clientName}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{g.clientPhone}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{g.garmentName} ({g.repairType})</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {g.description}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>${g.price.toLocaleString()}</td>
                  <td>{getStatusBadge(g.status)}</td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn"
                      style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }}
                      onClick={() => openEdit(g)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn"
                      style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000' }}
                      onClick={() => handleDelete(g.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No se encontraron órdenes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear */}
      {isCreateOpen && (
        <GarmentModal
          title="Registrar Nueva Orden"
          form={createForm}
          setForm={setCreateForm}
          onSubmit={handleCreate}
          onClose={() => { setIsCreateOpen(false); setCreateForm({ ...EMPTY_FORM }); }}
          showStatus={false}
        />
      )}

      {/* Modal Editar */}
      {editTarget && (
        <GarmentModal
          title={`Editar Orden #${editTarget.id}`}
          form={editForm}
          setForm={setEditForm}
          onSubmit={handleEdit}
          onClose={() => setEditTarget(null)}
          showStatus={true}
          garmentId={editTarget.id}
        />
      )}
    </div>
  );
}

type FormState = typeof EMPTY_FORM;

function GarmentModal({ title, form, setForm, onSubmit, onClose, showStatus, garmentId }: {
  title: string;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onClose: () => void;
  showStatus: boolean;
  garmentId?: string;
}) {
  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ width: '480px', padding: '32px' }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input required name="clientName" placeholder="Nombre Cliente" value={form.clientName} onChange={handle} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
            <input required name="clientPhone" placeholder="Teléfono" value={form.clientPhone} onChange={handle} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <input required name="garmentName" placeholder="Ej: Pantalón de Vestir" value={form.garmentName} onChange={handle} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          <div style={{ display: 'flex', gap: '12px' }}>
            <select required name="repairType" value={form.repairType} onChange={handle} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
              <option value="">Tipo de Arreglo...</option>
              <option value="dobladillo">Dobladillo</option>
              <option value="cierre">Cambio de Cierre</option>
              <option value="entalle">Entalle / Achicar</option>
              <option value="diseño">Diseño Nuevo</option>
            </select>
            <input required name="price" type="number" placeholder="Costo ($)" value={form.price || ''} onChange={handle} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <input required name="description" placeholder="Detalle exacto del trabajo a realizar..." value={form.description} onChange={handle} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', color: '#666', marginBottom: '4px', display: 'block' }}>Fecha de Ingreso</label>
              <input required name="intakeDate" type="date" value={form.intakeDate} onChange={handle} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', color: '#666', marginBottom: '4px', display: 'block' }}>Fecha de Entrega</label>
              <input required name="deliveryDate" type="date" value={form.deliveryDate} onChange={handle} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
            </div>
          </div>
          {showStatus && (
            <select name="status" value={form.status} onChange={handle} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
              <option value="recibido">Recibido</option>
              <option value="en_proceso">En Proceso</option>
              <option value="listo">Listo para Entrega</option>
              <option value="entregado">Entregado</option>
            </select>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar</button>
          </div>
        </form>
        {garmentId && <PhotoGallery garmentId={garmentId} />}
      </div>
    </div>
  );
}
