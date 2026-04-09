import { useEffect, useState } from 'react';
import { fetchFinances, createFinance, updateFinance, deleteFinance } from '../services/api';
import type { DBFinance } from '../services/api';
import { useToast } from '../components/ToastContext';

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  type: 'income',
  category: '',
  amount: 0,
  description: ''
};

export default function Finances() {
  const toast = useToast();
  const [finances, setFinances] = useState<DBFinance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterMonth, setFilterMonth] = useState('');

  // Edit state
  const [editTarget, setEditTarget] = useState<DBFinance | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });

  const load = (month?: string) => {
    setLoading(true);
    fetchFinances(month || undefined)
      .then(data => {
        setFinances(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setLoading(false);
      })
      .catch(err => { console.error(err); setLoading(false); });
  };

  useEffect(() => { load(filterMonth); }, [filterMonth]);

  const totalIncome = finances.filter(f => f.type === 'income').reduce((acc, f) => acc + f.amount, 0);
  const totalExpenses = finances.filter(f => f.type === 'expense').reduce((acc, f) => acc + f.amount, 0);
  const netIncome = totalIncome - totalExpenses;

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createFinance({ ...form, amount: Number(form.amount) });
      toast.success('Registro guardado correctamente');
      setIsModalOpen(false);
      setForm({ ...EMPTY_FORM });
      load(filterMonth);
    } catch {
      toast.error('Error al guardar el registro');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (f: DBFinance) => {
    setEditTarget(f);
    setEditForm({
      date: f.date,
      type: f.type,
      category: f.category,
      amount: f.amount,
      description: f.description
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditSubmitting(true);
    try {
      await updateFinance(editTarget.id, { ...editForm, amount: Number(editForm.amount) });
      toast.success('Registro actualizado correctamente');
      setEditTarget(null);
      load(filterMonth);
    } catch {
      toast.error('Error al actualizar el registro');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
    try {
      await deleteFinance(id);
      toast.success('Registro eliminado correctamente');
      load(filterMonth);
    } catch {
      toast.error('Error al eliminar el registro');
    }
  };

  if (loading && finances.length === 0) return <div>Cargando registros financieros...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex-between" style={{ marginBottom: '20px', flexShrink: 0 }}>
        <div>
          <h1>Control Financiero</h1>
          <p className="subtitle" style={{ margin: 0, fontSize: '14px' }}>Registro de ingresos y gastos del taller.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Nuevo Registro</button>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
        <input
          type="month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="input"
        />
        {filterMonth && (
          <button
            className="btn btn-filter"
            onClick={() => setFilterMonth('')}
          >
            Todos
          </button>
        )}
      </div>

      <div className="grid grid-cols-3" style={{ marginBottom: '16px', flexShrink: 0 }}>
        <div className="card" style={{ borderTop: '4px solid var(--success-color)' }}>
          <div className="stat-title">Ingresos Totales</div>
          <div className="stat-value" style={{ color: 'var(--success-color)' }}>${totalIncome.toLocaleString()}</div>
        </div>
        <div className="card" style={{ borderTop: '4px solid var(--urgent-color)' }}>
          <div className="stat-title">Gastos del Taller</div>
          <div className="stat-value" style={{ color: 'var(--urgent-color)' }}>${totalExpenses.toLocaleString()}</div>
        </div>
        <div className="card" style={{ borderTop: '4px solid var(--primary-color)' }}>
          <div className="stat-title">Ganancia Neta</div>
          <div className="stat-value">${netIncome.toLocaleString()}</div>
        </div>
      </div>

      <h2 style={{ marginBottom: '12px', fontSize: '18px', flexShrink: 0 }}>Últimos Movimientos</h2>
      <div className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Concepto / Descripción</th>
                <th>Monto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {finances.map(f => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600 }}>{new Date(f.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })}</td>
                  <td>
                    <span className={`badge ${f.type === 'income' ? 'completed' : 'pending'}`}>
                      {f.type === 'income' ? 'Ingreso' : 'Gasto'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{f.category}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{f.description}</div>
                  </td>
                  <td style={{ fontWeight: 800, color: f.type === 'income' ? 'var(--success-color)' : 'var(--urgent-color)' }}>
                    {f.type === 'income' ? '+' : '-'}${f.amount.toLocaleString()}
                  </td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-small"
                      style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }}
                      onClick={() => openEdit(f)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-small"
                      style={{ backgroundColor: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000' }}
                      onClick={() => handleDelete(f.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {finances.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px' }}>No hay registros financieros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Registro */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="card modal-card modal-md">
            <h2 style={{ marginTop: 0 }}>Nuevo Registro Financiero</h2>
            <form onSubmit={handleSubmit} className="form-group">
              <div className="form-row">
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', color: '#666', marginBottom: '4px', display: 'block' }}>Tipo</label>
                  <select name="type" value={form.type} onChange={handle} className="input">
                    <option value="income">Ingreso</option>
                    <option value="expense">Gasto</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', color: '#666', marginBottom: '4px', display: 'block' }}>Fecha</label>
                  <input required name="date" type="date" value={form.date} onChange={handle} className="input" />
                </div>
              </div>

              <div className="form-row">
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '13px', color: '#666', marginBottom: '4px', display: 'block' }}>Categoría / Concepto</label>
                  <input required name="category" placeholder={form.type === 'income' ? 'Ej: Arreglo Pantalón' : 'Ej: Hilo y Agujas'} value={form.category} onChange={handle} className="input" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', color: '#666', marginBottom: '4px', display: 'block' }}>Monto ($)</label>
                  <input required name="amount" type="number" placeholder="0" value={form.amount || ''} onChange={handle} className="input" />
                </div>
              </div>

              <input name="description" placeholder="Descripción adicional (opcional)" value={form.description} onChange={handle} className="input" />

              <div className="form-actions">
                <button type="button" onClick={() => { setIsModalOpen(false); setForm({ ...EMPTY_FORM }); }} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Registro */}
      {editTarget && (
        <div className="modal-overlay">
          <div className="card modal-card modal-sm">
            <h2 style={{ marginTop: 0 }}>Editar Registro</h2>
            <form onSubmit={handleEditSubmit} className="form-group">
              <div className="form-row">
                <select
                  name="type"
                  value={editForm.type}
                  onChange={handleEditChange}
                  className="input"
                  style={{ flex: 1 }}
                >
                  <option value="income">Ingreso</option>
                  <option value="expense">Gasto</option>
                </select>
                <input
                  required
                  name="date"
                  type="date"
                  value={editForm.date}
                  onChange={handleEditChange}
                  className="input"
                  style={{ flex: 1 }}
                />
              </div>
              <input
                required
                name="category"
                placeholder={editForm.type === 'income' ? 'Ej: Arreglo Pantalón' : 'Ej: Hilo y Agujas'}
                value={editForm.category}
                onChange={handleEditChange}
                className="input"
              />
              <input
                required
                name="amount"
                type="number"
                placeholder="Monto ($)"
                value={editForm.amount || ''}
                onChange={handleEditChange}
                className="input"
              />
              <input
                name="description"
                placeholder="Descripción adicional (opcional)"
                value={editForm.description}
                onChange={handleEditChange}
                className="input"
              />
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={editSubmitting} className="btn btn-primary">{editSubmitting ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
