import { useEffect, useState, useMemo } from 'react';
import { fetchFinances, createFinance, updateFinance, deleteFinance } from '../services/api';
import type { DBFinance } from '../services/api';
import { useToast } from '../components/ToastContext';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const { totalIncome, totalExpenses, netIncome } = useMemo(() => {
    const income = finances.filter(f => f.type === 'income').reduce((acc, f) => acc + f.amount, 0);
    const expenses = finances.filter(f => f.type === 'expense').reduce((acc, f) => acc + f.amount, 0);
    return { totalIncome: income, totalExpenses: expenses, netIncome: income - expenses };
  }, [finances]);

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

  if (loading && finances.length === 0) return <SkeletonLoader rows={5} />;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Control Financiero</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Registro de ingresos y gastos del taller.</p>
        </div>
        <button className="btn btn-primary shrink-0" onClick={() => setIsModalOpen(true)}>
          Nuevo Registro
        </button>
      </div>

      {/* Month filter */}
      <div className="flex items-center gap-3">
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 border-t-4 border-t-emerald-500">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Ingresos Totales
          </div>
          <div className="text-2xl font-bold text-emerald-600">${totalIncome.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 border-t-4 border-t-red-500">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingDown className="h-4 w-4 text-red-500" />
            Gastos del Taller
          </div>
          <div className="text-2xl font-bold text-red-600">${totalExpenses.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 border-t-4 border-t-primary">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4 text-primary" />
            Ganancia Neta
          </div>
          <div className={cn('text-2xl font-bold', netIncome >= 0 ? 'text-foreground' : 'text-red-600')}>
            ${netIncome.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Movements table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Últimos Movimientos</h2>
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Concepto / Descripción</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Monto</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {finances.map(f => (
                  <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">
                      {new Date(f.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={f.type === 'income' ? 'listo' : 'overdue'}>
                        {f.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{f.category}</div>
                      {f.description && (
                        <div className="text-xs text-muted-foreground">{f.description}</div>
                      )}
                    </td>
                    <td className={cn('px-4 py-3 font-bold whitespace-nowrap', f.type === 'income' ? 'text-emerald-600' : 'text-red-600')}>
                      {f.type === 'income' ? '+' : '-'}${f.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(f)}>
                          <Edit2 className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(f.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {finances.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-muted-foreground">
                      No hay registros financieros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Nuevo Registro */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="card modal-card modal-md">
            <h2 className="mt-0 mb-4 text-lg font-semibold">Nuevo Registro Financiero</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                  <select name="type" value={form.type} onChange={handle} className="input">
                    <option value="income">Ingreso</option>
                    <option value="expense">Gasto</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Fecha</label>
                  <input required name="date" type="date" value={form.date} onChange={handle} className="input" />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-[2]">
                  <label className="text-xs font-medium text-muted-foreground">Categoría / Concepto</label>
                  <input
                    required
                    name="category"
                    placeholder={form.type === 'income' ? 'Ej: Arreglo Pantalón' : 'Ej: Hilo y Agujas'}
                    value={form.category}
                    onChange={handle}
                    className="input"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Monto ($)</label>
                  <input required name="amount" type="number" placeholder="0" value={form.amount || ''} onChange={handle} className="input" />
                </div>
              </div>

              <input name="description" placeholder="Descripción adicional (opcional)" value={form.description} onChange={handle} className="input" />

              <div className="flex justify-end gap-3 mt-2">
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
            <h2 className="mt-0 mb-4 text-lg font-semibold">Editar Registro</h2>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div className="flex gap-3">
                <select
                  name="type"
                  value={editForm.type}
                  onChange={handleEditChange}
                  className="input flex-1"
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
                  className="input flex-1"
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
              <div className="flex justify-end gap-3 mt-2">
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
