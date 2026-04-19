import { useEffect, useState, useMemo } from 'react';
import { fetchFinances, createFinance, updateFinance, deleteFinance } from '../services/api';
import type { DBFinance } from '../services/api';
import { BUSINESS } from '../config';
import { useToast } from '../components/ToastContext';
import { SkeletonLoader } from '../components/SkeletonLoader';

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  type: 'income',
  category: '',
  amount: 0,
  description: ''
};

const inputClass = "w-full px-3 py-2 rounded-md border border-(--color-border) bg-(--color-card) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50";

export default function Finances() {
  const toast = useToast();
  const [finances, setFinances] = useState<DBFinance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterMonth, setFilterMonth] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);

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

  const { totalIncome, totalExpenses, netIncome } = useMemo(() => {
    const totalIncome = finances.filter(f => f.type === 'income').reduce((acc, f) => acc + f.amount, 0);
    const totalExpenses = finances.filter(f => f.type === 'expense').reduce((acc, f) => acc + f.amount, 0);
    return { totalIncome, totalExpenses, netIncome: totalIncome - totalExpenses };
  }, [finances]);

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCreate(true);
    try {
      await createFinance({ ...form, amount: Number(form.amount) });
      setIsModalOpen(false);
      setForm({ ...EMPTY_FORM });
      toast.success('Registro guardado correctamente');
      load(filterMonth);
    } catch {
      toast.error('Error al guardar el registro');
    } finally {
      setSubmittingCreate(false);
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
    setSubmittingEdit(true);
    try {
      await updateFinance(editTarget.id, { ...editForm, amount: Number(editForm.amount) });
      setEditTarget(null);
      toast.success('Registro actualizado correctamente');
      load(filterMonth);
    } catch {
      toast.error('Error al actualizar el registro');
    } finally {
      setSubmittingEdit(false);
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

  if (loading && finances.length === 0) return <SkeletonLoader rows={5} />;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div>
          <h1>Control Financiero</h1>
          <p className="subtitle" style={{ margin: 0, fontSize: '14px' }}>Registro de ingresos y gastos del consultorio.</p>
        </div>
        <button
          className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-(--color-primary) text-white font-semibold text-[15px] hover:bg-(--color-accent) hover:shadow-md transition-all"
          onClick={() => setIsModalOpen(true)}
        >
          + Nuevo Registro
        </button>
      </div>

      <div className="flex gap-3 items-center mb-4 flex-shrink-0">
        <input
          type="month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="input px-3 py-2 rounded-md border border-(--color-border) bg-(--color-card) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50"
        />
        {filterMonth && (
          <button
            className="btn btn-filter px-4 py-2 rounded-md border border-(--color-border) bg-(--color-muted) text-(--color-foreground) text-sm font-medium hover:bg-(--color-border) transition-colors"
            onClick={() => setFilterMonth('')}
          >
            Todos
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-4 flex-shrink-0">
        <div className="bg-(--color-card) rounded-2xl p-5 shadow-sm border border-(--color-border)" style={{ borderTop: '4px solid var(--success-color)' }}>
          <div className="text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider mb-3">Ingresos Totales</div>
          <div className="text-3xl font-extrabold text-(--color-success) tracking-tight">{BUSINESS.currency}{totalIncome.toLocaleString()}</div>
        </div>
        <div className="bg-(--color-card) rounded-2xl p-5 shadow-sm border border-(--color-border)" style={{ borderTop: '4px solid var(--urgent-color)' }}>
          <div className="text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider mb-3">Gastos del Consultorio</div>
          <div className="text-3xl font-extrabold text-(--color-destructive) tracking-tight">{BUSINESS.currency}{totalExpenses.toLocaleString()}</div>
        </div>
        <div className="bg-(--color-card) rounded-2xl p-5 shadow-sm border border-(--color-border)" style={{ borderTop: '4px solid var(--primary-color)' }}>
          <div className="text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider mb-3">Ganancia Neta</div>
          <div className="text-3xl font-extrabold text-(--color-foreground) tracking-tight">{BUSINESS.currency}{netIncome.toLocaleString()}</div>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-bold flex-shrink-0">Últimos Movimientos</h2>
      <div className="bg-(--color-card) rounded-2xl shadow-sm border border-(--color-border) overflow-hidden flex flex-col">
        <div className="w-full overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Fecha</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Tipo</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Concepto / Descripcion</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Monto</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {finances.map(f => (
                <tr key={f.id} className="border-b border-(--color-border) last:border-0">
                  <td className="px-5 py-4 text-[15px] text-(--color-foreground) font-semibold">{new Date(f.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                      f.type === 'income' ? 'bg-green-100 text-(--color-success)' : 'bg-yellow-100 text-(--color-accent)'
                    }`}>
                      {f.type === 'income' ? 'Ingreso' : 'Gasto'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-(--color-foreground)">{f.category}</div>
                    <div className="text-[13px] text-(--color-muted-foreground)">{f.description}</div>
                  </td>
                  <td className={`px-5 py-4 text-[15px] font-extrabold ${f.type === 'income' ? 'text-(--color-success)' : 'text-(--color-destructive)'}`}>
                    {f.type === 'income' ? '+' : '-'}{BUSINESS.currency}{f.amount.toLocaleString()}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1 text-xs rounded-md border border-(--color-border) bg-(--color-muted) text-(--color-foreground) hover:bg-(--color-border) transition-colors"
                        onClick={() => openEdit(f)}
                      >
                        Editar
                      </button>
                      <button
                        className="px-3 py-1 text-xs rounded-md bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors"
                        onClick={() => handleDelete(f.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {finances.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center px-5 py-8 text-(--color-muted-foreground) text-sm">No hay registros financieros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="modal-card modal-md bg-(--color-card) rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl border border-(--color-border)">
            <h2 className="text-xl font-bold text-(--color-foreground) mb-4 mt-0">Nuevo Registro Financiero</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-(--color-muted-foreground) mb-1">Tipo</label>
                  <select name="type" value={form.type} onChange={handle} className={inputClass}>
                    <option value="income">Ingreso</option>
                    <option value="expense">Gasto</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-(--color-muted-foreground) mb-1">Fecha</label>
                  <input required name="date" type="date" value={form.date} onChange={handle} className={inputClass} />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-[2]">
                  <label className="block text-xs text-(--color-muted-foreground) mb-1">Concepto</label>
                  <input required name="category" placeholder={form.type === 'income' ? 'Ej: Masaje Descontracturante' : 'Ej: Aceites y cremas'} value={form.category} onChange={handle} className={inputClass} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-(--color-muted-foreground) mb-1">Monto ($)</label>
                  <input required name="amount" type="number" placeholder="0" value={form.amount || ''} onChange={handle} className={inputClass} />
                </div>
              </div>

              <input name="description" placeholder="Descripción adicional (opcional)" value={form.description} onChange={handle} className={inputClass} />

              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => { setIsModalOpen(false); setForm({ ...EMPTY_FORM }); }} className="px-4 py-2 rounded-md font-semibold text-sm text-(--color-muted-foreground) hover:bg-(--color-muted) transition-colors">Cancelar</button>
                <button type="submit" disabled={submittingCreate} className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-(--color-primary) text-white font-semibold hover:bg-(--color-accent) transition-all disabled:opacity-60">
                  {submittingCreate ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Registro */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-(--color-card) rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl border border-(--color-border)">
            <h2 className="text-xl font-bold text-(--color-foreground) mb-4 mt-0">Editar Registro</h2>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <select name="type" value={editForm.type} onChange={handleEditChange} className={`flex-1 ${inputClass}`}>
                  <option value="income">Ingreso</option>
                  <option value="expense">Gasto</option>
                </select>
                <input required name="date" type="date" value={editForm.date} onChange={handleEditChange} className={`flex-1 ${inputClass}`} />
              </div>
              <input required name="category" placeholder={editForm.type === 'income' ? 'Ej: Masaje Descontracturante' : 'Ej: Aceites y cremas'} value={editForm.category} onChange={handleEditChange} className={inputClass} />
              <input required name="amount" type="number" placeholder="Monto ($)" value={editForm.amount || ''} onChange={handleEditChange} className={inputClass} />
              <input name="description" placeholder="Descripcion adicional (opcional)" value={editForm.description} onChange={handleEditChange} className={inputClass} />
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setEditTarget(null)} className="px-4 py-2 rounded-md font-semibold text-sm text-(--color-muted-foreground) hover:bg-(--color-muted) transition-colors">Cancelar</button>
                <button type="submit" disabled={submittingEdit} className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-(--color-primary) text-white font-semibold hover:bg-(--color-accent) transition-all disabled:opacity-60">
                  {submittingEdit ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
