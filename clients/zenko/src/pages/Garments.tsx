import { useEffect, useState } from 'react';
import { fetchGarments, createGarment, updateGarment, deleteGarment } from '../services/api';
import type { DBGarment } from '../services/api';
import { generateTicket } from '../services/generateTicket';
import { useToast } from '../components/ToastContext';
import { BUSINESS } from '../config';
import GarmentModal, { EMPTY_FORM } from '../components/GarmentModal';

export default function Garments() {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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

  const STATUS_ORDER: Record<string, number> = { listo: 0, en_proceso: 1, recibido: 2, entregado: 3 };

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = (g: DBGarment) => g.deliveryDate < today && g.status !== 'entregado';

  const statusCounts = garments.reduce<Record<string, number>>((acc, g) => {
    acc[g.status] = (acc[g.status] || 0) + 1;
    return acc;
  }, {});

  const filtered = garments
    .filter(g => {
      if (statusFilter !== 'all' && g.status !== statusFilter) return false;
      const q = searchTerm.toLowerCase();
      return g.clientName.toLowerCase().includes(q) ||
        g.garmentName.toLowerCase().includes(q) ||
        g.repairType.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.id.toLowerCase().includes(q);
    })
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createGarment({ ...createForm, price: Number(createForm.price) });
      toast.success('Orden guardada correctamente');
      setIsCreateOpen(false);
      setCreateForm({ ...EMPTY_FORM });
      load();
    } catch {
      toast.error('Error al guardar la orden');
    }
  };

  const openEdit = (g: DBGarment) => {
    setEditTarget(g);
    setEditForm({
      clientName: g.clientName, clientPhone: g.clientPhone,
      garmentName: g.garmentName, repairType: g.repairType,
      description: g.description, intakeDate: g.intakeDate || '', deliveryDate: g.deliveryDate,
      price: g.price, deposit: g.deposit || 0, status: g.status, location: g.location || ''
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      await updateGarment(editTarget.id, { ...editForm, price: Number(editForm.price) });
      toast.success('Orden actualizada correctamente');
      setEditTarget(null);
      load();
    } catch {
      toast.error('Error al actualizar la orden');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta orden? Esta acción no se puede deshacer.')) return;
    try {
      await deleteGarment(id);
      toast.success('Orden eliminada correctamente');
      load();
    } catch {
      toast.error('Error al eliminar la orden');
    }
  };

  const badgeStyle = (bg: string, fg: string, bd: string): React.CSSProperties => ({
    background: bg, color: fg, border: `1px solid ${bd}`, whiteSpace: 'nowrap', display: 'inline-block', fontSize: '12px', padding: '4px 10px', borderRadius: '12px', fontWeight: 600
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'recibido': return <span style={badgeStyle('#fff3e0', '#e65100', '#ffcc80')}>● Recibido</span>;
      case 'en_proceso': return <span style={badgeStyle('#e3f2fd', '#1565c0', '#90caf9')}>⚙ En Proceso</span>;
      case 'listo': return <span style={badgeStyle('#e8f5e9', '#2e7d32', '#a5d6a7')}>✓ Listo</span>;
      case 'entregado': return <span style={badgeStyle('#f5f5f5', '#757575', '#e0e0e0')}>✔ Entregado</span>;
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

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'Todos', count: garments.length },
          { key: 'recibido', label: 'Recibido', count: statusCounts['recibido'] || 0 },
          { key: 'en_proceso', label: 'En Proceso', count: statusCounts['en_proceso'] || 0 },
          { key: 'listo', label: 'Listo', count: statusCounts['listo'] || 0 },
          { key: 'entregado', label: 'Entregado', count: statusCounts['entregado'] || 0 },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={`btn btn-small${statusFilter === key ? ' btn-primary' : ''}`}
            style={statusFilter !== key ? { backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' } : {}}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px' }}>
          <input
            type="text"
            placeholder="Buscar por cliente, prenda o nro orden..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-search"
          />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID Orden</th>
                <th>Cliente</th>
                <th>Prenda & Detalle</th>
                <th>Ingreso</th>
                <th>Entrega</th>
                <th>Costo / Saldo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => (
                <tr key={g.id} style={isOverdue(g) ? { backgroundColor: '#fff8f0' } : undefined}>
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
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{new Date(g.intakeDate + 'T00:00:00').toLocaleDateString('es-AR')}</td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{new Date(g.deliveryDate + 'T00:00:00').toLocaleDateString('es-AR')}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>Total: ${g.price.toLocaleString()}</div>
                    {g.deposit !== undefined && g.deposit > 0 && <div style={{ fontSize: '12px', color: '#689f38' }}>Seña: ${g.deposit.toLocaleString()}</div>}
                    {g.deposit !== undefined && g.deposit > 0 && <div style={{ fontSize: '12px', color: '#d32f2f', fontWeight: 600 }}>Saldo: ${(g.price - g.deposit).toLocaleString()}</div>}
                  </td>
                  <td>
                    {getStatusBadge(g.status)}
                    {isOverdue(g) && (
                      <span style={{ display: 'block', fontSize: '11px', color: '#d32f2f', fontWeight: 600, marginTop: '2px' }}>
                        Vencido
                      </span>
                    )}
                  </td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-small"
                      style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }}
                      onClick={() => openEdit(g)}
                    >
                      Editar
                    </button>
                    {g.status === 'listo' && (
                      <a
                        className="btn btn-small"
                        href={`https://wa.me/${g.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(BUSINESS.whatsappReadyMsg(g.clientName, g.garmentName))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ backgroundColor: '#f0fff4', border: '1px solid #9ae6b4', color: '#276749', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                      >
                        Avisar
                      </a>
                    )}
                    <button
                      className="btn btn-small"
                      style={{ backgroundColor: '#f0f5ff', border: '1px solid #cce0ff', color: '#0055cc' }}
                      onClick={() => generateTicket(g)}
                    >
                      Ticket
                    </button>
                    <button
                      className="btn btn-small"
                      style={{ backgroundColor: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000' }}
                      onClick={() => handleDelete(g.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
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

