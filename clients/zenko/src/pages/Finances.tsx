import { useEffect, useState, useMemo } from 'react';
import { fetchFinances, fetchGarments, createFinance, updateFinance, deleteFinance } from '../services/api';
import type { DBFinance, DBGarment } from '../services/api';
import { useToast } from '../components/ToastContext';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, DollarSign, Edit2, Trash2, Plus, Clock, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Edit state
  const [editTarget, setEditTarget] = useState<DBFinance | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });

  const [garments, setGarments] = useState<DBGarment[]>([]);
  const [showPending, setShowPending] = useState(false);

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

  useEffect(() => {
    fetchGarments().then(setGarments).catch(() => {});
  }, []);

  const { totalIncome, totalExpenses, netIncome } = useMemo(() => {
    const income = finances.filter(f => f.type === 'income').reduce((acc, f) => acc + f.amount, 0);
    const expenses = finances.filter(f => f.type === 'expense').reduce((acc, f) => acc + f.amount, 0);
    return { totalIncome: income, totalExpenses: expenses, netIncome: income - expenses };
  }, [finances]);

  const { pendingGarments, pendingTotal } = useMemo(() => {
    const pending = garments.filter(g => g.status !== 'entregado');
    const total = pending.reduce((acc, g) => acc + ((g.items ?? []).reduce((s, i) => s + i.price, 0) - (g.deposit ?? 0)), 0);
    return { pendingGarments: pending, pendingTotal: total };
  }, [garments]);

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
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Control Financiero</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Registro de ingresos y gastos del taller.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="shrink-0 self-start">
          <Plus className="h-4 w-4" />
          Nuevo Registro
        </Button>
      </div>

      {/* Month filter */}
      <div className="flex items-center gap-3">
        <Input
          type="month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="w-auto"
        />
        {filterMonth && (
          <Button
            variant="outline"
            onClick={() => setFilterMonth('')}
            className="h-10"
          >
            Ver todo el historial
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 border-t-4 border-t-emerald-500">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Ingresos Totales
          </div>
          <div className="text-2xl font-bold text-status-positive">${totalIncome.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 border-t-4 border-t-red-500">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingDown className="h-4 w-4 text-red-500" />
            Gastos del Taller
          </div>
          <div className="text-2xl font-bold text-status-negative">${totalExpenses.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 border-t-4 border-t-primary">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4 text-primary" />
            Ganancia Neta
          </div>
          <div className={cn('text-2xl font-bold', netIncome >= 0 ? 'text-foreground' : 'text-status-negative')}>
            ${netIncome.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Cuentas a cobrar — prendas no entregadas */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <button
          onClick={() => setShowPending(p => !p)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-foreground text-sm">Cuentas a Cobrar</span>
            <Badge variant="secondary" className="text-xs">{pendingGarments.length} prendas</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-orange-500">${pendingTotal.toLocaleString('es-AR')}</span>
            {showPending ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>

        {showPending && (
          <div className="border-t border-border">
            {pendingGarments.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">Sin prendas pendientes.</p>
            ) : (
              <div className="divide-y divide-border">
                {pendingGarments.map(g => {
                  const saldo = (g.items ?? []).reduce((s, i) => s + i.price, 0) - (g.deposit ?? 0);
                  const STATUS_LABEL: Record<string, string> = { recibido: 'Recibido', en_proceso: 'En Proceso', listo: 'Listo' };
                  return (
                    <div key={g.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          ORD-{String(g.orderNumber).padStart(6, '0')} · {g.clientName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{(g.items ?? []).map(i => i.garmentName).join(', ')}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <Badge variant={g.status === 'listo' ? 'listo' : g.status === 'en_proceso' ? 'en_proceso' : 'recibido'} className="text-xs">
                          {STATUS_LABEL[g.status] ?? g.status}
                        </Badge>
                        <span className="font-bold text-orange-500 whitespace-nowrap">${saldo.toLocaleString('es-AR')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Movements */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Últimos Movimientos</h2>

        {finances.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            No hay registros financieros.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fecha</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tipo</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Concepto / Descripcion</th>
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
                        <td className={cn('px-4 py-3 font-bold whitespace-nowrap', f.type === 'income' ? 'text-status-positive' : 'text-status-negative')}>
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
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Dialog Nuevo Registro */}
      <Dialog open={isModalOpen} onOpenChange={open => { if (!open) { setIsModalOpen(false); setForm({ ...EMPTY_FORM }); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" onClose={() => { setIsModalOpen(false); setForm({ ...EMPTY_FORM }); }}>
          <DialogHeader>
            <DialogTitle>Nuevo Registro Financiero</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <Select name="type" value={form.type} onChange={handle}>
                  <option value="income">Ingreso</option>
                  <option value="expense">Gasto</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs font-medium text-muted-foreground">Fecha</label>
                <Input required name="date" type="date" value={form.date} onChange={handle} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex flex-col gap-1.5 sm:flex-[2]">
                <label className="text-xs font-medium text-muted-foreground">Concepto</label>
                <Input
                  required
                  name="category"
                  placeholder={form.type === 'income' ? 'Ej: Arreglo Pantalón' : 'Ej: Hilo y Agujas'}
                  value={form.category}
                  onChange={handle}
                />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs font-medium text-muted-foreground">Monto ($)</label>
                <Input required name="amount" type="number" placeholder="0" value={form.amount || ''} onChange={handle} />
              </div>
            </div>

            <Input name="description" placeholder="Descripción adicional (opcional)" value={form.description} onChange={handle} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setForm({ ...EMPTY_FORM }); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Registro */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" onClose={() => setEditTarget(null)}>
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                name="type"
                value={editForm.type}
                onChange={handleEditChange}
                className="flex-1"
              >
                <option value="income">Ingreso</option>
                <option value="expense">Gasto</option>
              </Select>
              <Input
                required
                name="date"
                type="date"
                value={editForm.date}
                onChange={handleEditChange}
                className="flex-1"
              />
            </div>
            <Input
              required
              name="category"
              placeholder={editForm.type === 'income' ? 'Ej: Arreglo Pantalón' : 'Ej: Hilo y Agujas'}
              value={editForm.category}
              onChange={handleEditChange}
            />
            <Input
              required
              name="amount"
              type="number"
              placeholder="Monto ($)"
              value={editForm.amount || ''}
              onChange={handleEditChange}
            />
            <Input
              name="description"
              placeholder="Descripción adicional (opcional)"
              value={editForm.description}
              onChange={handleEditChange}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
