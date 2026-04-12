import { useEffect, useState, useMemo, useCallback, type FormEvent } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, X, Trash2, Pencil } from 'lucide-react';
import { cn, formatCurrency, formatDate, today } from '../lib/utils';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';
import type { Finance, FinanceType } from '@platform/types';
import type { TenantConfig } from '@platform/config';

// ─── Props ────────────────────────────────────────────────────────────────────

interface FinancesProps {
  tenant: TenantConfig;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INCOME_CATEGORIES = ['ventas', 'servicios', 'otros ingresos'];
const EXPENSE_CATEGORIES = ['insumos', 'alquiler', 'servicios', 'sueldos', 'marketing', 'otros gastos'];

// ─── Form ─────────────────────────────────────────────────────────────────────

interface FinanceForm {
  date: string;
  type: FinanceType;
  category: string;
  amount: string;
  description: string;
}

function emptyForm(type: FinanceType = 'ingreso'): FinanceForm {
  return { date: today(), type, category: '', amount: '', description: '' };
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  form: FinanceForm;
  onChange: (field: keyof FinanceForm, value: string) => void;
  submitting: boolean;
}

function FinanceModal({ title, onClose, onSubmit, form, onChange, submitting }: ModalProps) {
  const categories = form.type === 'ingreso' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card rounded-2xl border shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-base">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          {/* Type tabs */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              type="button"
              onClick={() => { onChange('type', 'ingreso'); onChange('category', ''); }}
              className={cn(
                'flex-1 py-2 text-sm font-medium transition-colors',
                form.type === 'ingreso' ? 'bg-emerald-600 text-white' : 'hover:bg-muted',
              )}
            >
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => { onChange('type', 'gasto'); onChange('category', ''); }}
              className={cn(
                'flex-1 py-2 text-sm font-medium transition-colors',
                form.type === 'gasto' ? 'bg-red-600 text-white' : 'hover:bg-muted',
              )}
            >
              Gasto
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Descripción *</label>
            <input
              required
              autoFocus
              value={form.description}
              onChange={(e) => onChange('description', e.target.value)}
              placeholder="ej: Venta de servicio…"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Monto *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => onChange('amount', e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Fecha *</label>
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => onChange('date', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Categoría</label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onChange('category', cat)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors capitalize',
                    form.category === cat
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {cat}
                </button>
              ))}
              <input
                value={categories.includes(form.category) ? '' : form.category}
                onChange={(e) => onChange('category', e.target.value)}
                placeholder="Otra…"
                className="flex-1 min-w-[80px] rounded-full border border-dashed bg-background px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                'flex-1 rounded-lg py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60',
                form.type === 'ingreso' ? 'bg-emerald-600' : 'bg-red-600',
              )}
            >
              {submitting ? 'Guardando…' : `Guardar ${form.type}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Month picker ─────────────────────────────────────────────────────────────

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Finances({ tenant }: FinancesProps) {
  const api = useApi();
  const toast = useToast();

  const [finances, setFinances] = useState<Finance[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(currentYearMonth());
  const [typeFilter, setTypeFilter] = useState<'all' | FinanceType>('all');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<FinanceType>('ingreso');
  const [createForm, setCreateForm] = useState<FinanceForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  const [editTarget, setEditTarget] = useState<Finance | null>(null);
  const [editForm, setEditForm] = useState<FinanceForm>(emptyForm());

  const [confirmDelete, setConfirmDelete] = useState<Finance | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.finances.list();
      setFinances(data);
    } catch {
      toast.error('Error al cargar finanzas');
    } finally {
      setLoading(false);
    }
  }, [api, toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return finances.filter((f) => {
      if (monthFilter && !f.date.startsWith(monthFilter)) return false;
      if (typeFilter !== 'all' && f.type !== typeFilter) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [finances, monthFilter, typeFilter]);

  const summary = useMemo(() => {
    const income = filtered.filter((f) => f.type === 'ingreso').reduce((s, f) => s + f.amount, 0);
    const expenses = filtered.filter((f) => f.type === 'gasto').reduce((s, f) => s + f.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [filtered]);

  // ─── CRUD ───────────────────────────────────────────────────────────────────
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.finances.create({
        ...createForm,
        amount: Number(createForm.amount),
        business: tenant.slug,
      });
      toast.success(`${createForm.type === 'ingreso' ? 'Ingreso' : 'Gasto'} registrado`);
      setIsCreateOpen(false);
      setCreateForm(emptyForm());
      await load();
    } catch {
      toast.error('Error al registrar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await api.finances.update(editTarget.id, { ...editForm, amount: Number(editForm.amount) });
      toast.success('Registro actualizado');
      setEditTarget(null);
      await load();
    } catch {
      toast.error('Error al actualizar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.finances.delete(confirmDelete.id);
      toast.success('Registro eliminado');
      setConfirmDelete(null);
      await load();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const openCreate = (type: FinanceType) => {
    setDefaultType(type);
    setCreateForm(emptyForm(type));
    setIsCreateOpen(true);
  };

  const openEdit = (f: Finance) => {
    setEditTarget(f);
    setEditForm({
      date: f.date,
      type: f.type,
      category: f.category,
      amount: String(f.amount),
      description: f.description,
    });
  };

  const updateField =
    (setter: React.Dispatch<React.SetStateAction<FinanceForm>>) =>
    (field: keyof FinanceForm, value: string) =>
      setter((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="text-lg font-semibold">Finanzas</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} registros · {monthFilter || 'todos los meses'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openCreate('ingreso')}
            className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ingreso</span>
          </button>
          <button
            onClick={() => openCreate('gasto')}
            className="flex items-center gap-1.5 bg-red-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Gasto</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Ingresos
          </p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summary.income, tenant.currency)}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-red-500" /> Gastos
          </p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(summary.expenses, tenant.currency)}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" /> Balance
          </p>
          <p className={cn('text-xl font-bold', summary.balance >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400')}>
            {formatCurrency(summary.balance, tenant.currency)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {(['all', 'ingreso', 'gasto'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              'px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors capitalize',
              typeFilter === t ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted',
            )}
          >
            {t === 'all' ? 'Todos' : t === 'ingreso' ? 'Ingresos' : 'Gastos'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay registros para este período</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Tipo</th>
                  <th className="text-right">Monto</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id}>
                    <td className="text-sm text-muted-foreground">{formatDate(f.date)}</td>
                    <td className="font-medium">{f.description}</td>
                    <td className="text-sm capitalize text-muted-foreground">{f.category || '—'}</td>
                    <td>
                      <span
                        className={cn(
                          'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                          f.type === 'ingreso'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                        )}
                      >
                        {f.type === 'ingreso' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </td>
                    <td
                      className={cn(
                        'text-right font-semibold',
                        f.type === 'ingreso' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                      )}
                    >
                      {f.type === 'ingreso' ? '+' : '-'}
                      {formatCurrency(f.amount, tenant.currency)}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDelete(f)} className="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors text-muted-foreground">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((f) => (
              <div key={f.id} className="rounded-xl border bg-card p-3 flex items-center gap-3">
                <div
                  className={cn(
                    'w-1 self-stretch rounded-full flex-shrink-0',
                    f.type === 'ingreso' ? 'bg-emerald-500' : 'bg-red-500',
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.description}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {f.category || f.type} · {formatDate(f.date)}
                  </p>
                </div>
                <p className={cn('text-sm font-bold flex-shrink-0', f.type === 'ingreso' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                  {f.type === 'ingreso' ? '+' : '-'}
                  {formatCurrency(f.amount, tenant.currency)}
                </p>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmDelete(f)} className="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors text-muted-foreground">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      {isCreateOpen && (
        <FinanceModal
          title={`Nuevo ${defaultType}`}
          onClose={() => { setIsCreateOpen(false); setCreateForm(emptyForm()); }}
          onSubmit={handleCreate}
          form={createForm}
          onChange={updateField(setCreateForm)}
          submitting={submitting}
        />
      )}

      {editTarget && (
        <FinanceModal
          title="Editar registro"
          onClose={() => setEditTarget(null)}
          onSubmit={handleEdit}
          form={editForm}
          onChange={updateField(setEditForm)}
          submitting={submitting}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-2">Eliminar registro</h3>
            <p className="text-sm text-muted-foreground mb-5">
              ¿Eliminar "<strong>{confirmDelete.description}</strong>"?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg border py-2.5 text-sm hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 rounded-lg bg-destructive text-destructive-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
