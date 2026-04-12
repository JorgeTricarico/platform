import { useEffect, useState, useMemo, useCallback, type FormEvent } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  MessageCircle,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { DataView, type ColumnDef } from '../../../../packages/ui/src/components/DataView';
import { cn, formatCurrency, formatDate, isOverdue, today } from '../lib/utils';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';
import type { Order, OrderStatus } from '@platform/types';
import type { TenantConfig } from '@platform/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface GarmentsProps {
  tenant: TenantConfig;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  recibido:   'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  en_proceso: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  listo:      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  entregado:  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full',
        STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </span>
  );
}

// ─── Empty form ───────────────────────────────────────────────────────────────

interface GarmentForm {
  clientName: string;
  clientPhone: string;
  garmentName: string;
  repairType: string;
  description: string;
  status: OrderStatus;
  intakeDate: string;
  deliveryDate: string;
  price: string;
  deposit: string;
  location: string;
}

function emptyForm(): GarmentForm {
  return {
    clientName: '',
    clientPhone: '',
    garmentName: '',
    repairType: '',
    description: '',
    status: 'recibido',
    intakeDate: today(),
    deliveryDate: '',
    price: '',
    deposit: '0',
    location: '',
  };
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  form: GarmentForm;
  onChange: (field: keyof GarmentForm, value: string) => void;
  serviceTypes: string[];
  statuses: TenantConfig['statuses'];
  submitting: boolean;
}

function GarmentModal({
  title, onClose, onSubmit, form, onChange, serviceTypes, statuses, submitting,
}: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-card rounded-2xl border shadow-xl w-full"
        style={{ maxWidth: 'min(540px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-base">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Nombre cliente *</label>
              <input
                required
                value={form.clientName}
                onChange={(e) => onChange('clientName', e.target.value)}
                placeholder="Nombre"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Teléfono</label>
              <input
                value={form.clientPhone}
                onChange={(e) => onChange('clientPhone', e.target.value)}
                placeholder="11-1234-5678"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Prenda / artículo *</label>
            <input
              required
              value={form.garmentName}
              onChange={(e) => onChange('garmentName', e.target.value)}
              placeholder="ej: Pantalón azul"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Tipo de arreglo *</label>
            <div className="flex flex-wrap gap-1.5">
              {serviceTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onChange('repairType', t)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize',
                    form.repairType === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {t}
                </button>
              ))}
              <input
                value={serviceTypes.includes(form.repairType) ? '' : form.repairType}
                onChange={(e) => onChange('repairType', e.target.value)}
                placeholder="Otro…"
                className="flex-1 min-w-[80px] rounded-full border border-dashed bg-background px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => onChange('description', e.target.value)}
              rows={2}
              placeholder="Detalles del arreglo…"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Estado</label>
              <select
                value={form.status}
                onChange={(e) => onChange('status', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {statuses.map(({ key, label }) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Ubicación</label>
              <input
                value={form.location}
                onChange={(e) => onChange('location', e.target.value)}
                placeholder="Perchero A3…"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Precio *</label>
              <input
                required
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => onChange('price', e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Seña</label>
              <input
                type="number"
                min="0"
                value={form.deposit}
                onChange={(e) => onChange('deposit', e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Entrega</label>
              <input
                type="date"
                value={form.deliveryDate}
                onChange={(e) => onChange('deliveryDate', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
              className="flex-1 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {submitting ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Garments({ tenant }: GarmentsProps) {
  const api = useApi();
  const toast = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [repairTypeFilter, setRepairTypeFilter] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<GarmentForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  const [editTarget, setEditTarget] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState<GarmentForm>(emptyForm());

  const [confirmDelete, setConfirmDelete] = useState<Order | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.orders.list();
      setOrders(data);
    } catch {
      toast.error('Error al cargar las órdenes');
    } finally {
      setLoading(false);
    }
  }, [api, toast]);

  useEffect(() => { load(); }, [load]);

  // ─── Filtering / sorting ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return orders
      .filter((o) => {
        if (statusFilter !== 'all' && o.status !== statusFilter) return false;
        if (repairTypeFilter && o.repairType !== repairTypeFilter) return false;
        if (onlyOverdue && !isOverdue(o.deliveryDate, o.status)) return false;
        if (term && !o.clientName.toLowerCase().includes(term) &&
            !o.garmentName.toLowerCase().includes(term) &&
            !String(o.orderNumber).includes(term)) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by status priority then by intake date desc
        const statusOrder: Record<string, number> = {
          listo: 0, en_proceso: 1, recibido: 2, entregado: 3,
        };
        const sa = statusOrder[a.status] ?? 99;
        const sb = statusOrder[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        return new Date(b.intakeDate).getTime() - new Date(a.intakeDate).getTime();
      });
  }, [orders, searchTerm, statusFilter, repairTypeFilter, onlyOverdue]);

  // ─── CRUD handlers ──────────────────────────────────────────────────────────
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.orders.create({
        ...createForm,
        price: Number(createForm.price),
        deposit: Number(createForm.deposit),
      });
      toast.success('Orden creada correctamente');
      setIsCreateOpen(false);
      setCreateForm(emptyForm());
      await load();
    } catch {
      toast.error('Error al crear la orden');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await api.orders.update(editTarget.id, {
        ...editForm,
        price: Number(editForm.price),
        deposit: Number(editForm.deposit),
      });
      toast.success('Orden actualizada');
      setEditTarget(null);
      await load();
    } catch {
      toast.error('Error al actualizar la orden');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.orders.delete(confirmDelete.id);
      toast.success('Orden eliminada');
      setConfirmDelete(null);
      await load();
    } catch {
      toast.error('Error al eliminar la orden');
    }
  };

  const openEdit = (order: Order) => {
    setEditTarget(order);
    setEditForm({
      clientName: order.clientName,
      clientPhone: order.clientPhone,
      garmentName: order.garmentName,
      repairType: order.repairType,
      description: order.description,
      status: order.status,
      intakeDate: order.intakeDate,
      deliveryDate: order.deliveryDate,
      price: String(order.price),
      deposit: String(order.deposit),
      location: order.location ?? '',
    });
  };

  const handleWhatsApp = (order: Order) => {
    const msg = order.status === 'listo'
      ? tenant.whatsappTemplates.ready(order.clientName, order.garmentName)
      : tenant.whatsappTemplates.reminder(order.clientName, order.garmentName);
    const phone = order.clientPhone.replace(/\D/g, '');
    window.open(`https://wa.me/54${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const updateFormField = (setter: React.Dispatch<React.SetStateAction<GarmentForm>>) =>
    (field: keyof GarmentForm, value: string) =>
      setter((prev) => ({ ...prev, [field]: value }));

  const statusLabel = (status: string) =>
    tenant.statuses.find((s) => s.key === status)?.label ?? status;

  const allRepairTypes = [...new Set(orders.map((o) => o.repairType).filter(Boolean))];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="text-lg font-semibold">Órdenes de trabajo</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'orden' : 'órdenes'}
            {statusFilter !== 'all' && ` · ${statusLabel(statusFilter)}`}
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva orden</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* Search + filters bar */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, prenda o #orden…"
              className="w-full rounded-lg border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors',
              showFilters ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted',
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
          </button>
        </div>

        {/* Status chips */}
        <div className="flex gap-1.5 flex-wrap">
          {[{ key: 'all', label: 'Todos' }, ...tenant.statuses].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                statusFilter === key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted',
              )}
            >
              {label}
              {key !== 'all' && (
                <span className="ml-1 opacity-70">
                  ({orders.filter((o) => o.status === key).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 p-3 rounded-xl bg-muted/50 border">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={onlyOverdue}
                onChange={(e) => setOnlyOverdue(e.target.checked)}
                className="rounded"
              />
              Solo vencidas
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Tipo:</label>
              <select
                value={repairTypeFilter}
                onChange={(e) => setRepairTypeFilter(e.target.value)}
                className="rounded-lg border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Todos</option>
                {allRepairTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Data view — desktop table + mobile cards */}
      {(() => {
        const columns: ColumnDef<Order>[] = [
          {
            key: 'orderNumber',
            header: '#',
            sortable: true,
            width: '90px',
            render: (val) => (
              <span className="font-mono text-xs text-muted-foreground">#{val as number}</span>
            ),
          },
          {
            key: 'clientName',
            header: 'Cliente',
            sortable: true,
            render: (val, item) => (
              <div>
                <p className="font-medium">{val as string}</p>
                <p className="text-xs text-muted-foreground">{item.clientPhone}</p>
              </div>
            ),
          },
          { key: 'garmentName', header: 'Prenda', hideOnMobile: true },
          { key: 'repairType', header: 'Tipo', sortable: true, hideOnMobile: true },
          {
            key: 'status',
            header: 'Estado',
            render: (val) => (
              <StatusBadge status={val as string} label={statusLabel(val as string)} />
            ),
          },
          {
            key: 'deliveryDate',
            header: 'Entrega',
            sortable: true,
            hideOnMobile: true,
            render: (val, item) => {
              const overdue = isOverdue(item.deliveryDate, item.status);
              return (
                <span className={cn('text-sm', overdue && 'text-red-600 dark:text-red-400 font-medium')}>
                  {formatDate(val as string)}
                </span>
              );
            },
          },
          {
            key: 'price',
            header: 'Precio',
            sortable: true,
            hideOnMobile: true,
            render: (val) => (
              <span className="font-medium">{formatCurrency(val as number, tenant.currency)}</span>
            ),
          },
          {
            key: 'id',
            header: '',
            render: (_val, item) => (
              <div className="flex items-center justify-end gap-1">
                {tenant.features.whatsappNotifications && item.clientPhone && (
                  <button
                    onClick={() => handleWhatsApp(item)}
                    title="Enviar WhatsApp"
                    className="p-1.5 rounded-lg hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 transition-colors text-muted-foreground"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => openEdit(item)}
                  title="Editar"
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setConfirmDelete(item)}
                  title="Eliminar"
                  className="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors text-muted-foreground"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ),
          },
        ];

        const renderCard = (item: Order) => {
          const overdue = isOverdue(item.deliveryDate, item.status);
          return (
            <div className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">#{item.orderNumber}</span>
                    <StatusBadge status={item.status} label={statusLabel(item.status)} />
                  </div>
                  <p className="font-semibold text-sm truncate">{item.clientName}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.garmentName} · {item.repairType}</p>
                </div>
                <p className="font-bold text-sm flex-shrink-0">{formatCurrency(item.price, tenant.currency)}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className={cn('text-xs', overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground')}>
                  Entrega: {formatDate(item.deliveryDate)}
                </span>
                <div className="flex gap-1">
                  {tenant.features.whatsappNotifications && item.clientPhone && (
                    <button
                      onClick={() => handleWhatsApp(item)}
                      className="p-1.5 rounded-lg hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 transition-colors text-muted-foreground"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmDelete(item)} className="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors text-muted-foreground">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        };

        return (
          <DataView
            data={filtered}
            columns={columns}
            renderCard={renderCard}
            rowKey="id"
            loading={loading}
            emptyState={
              <p className="text-center text-muted-foreground py-16 text-sm">
                No se encontraron órdenes
              </p>
            }
          />
        );
      })()}

      {/* Create modal */}
      {isCreateOpen && (
        <GarmentModal
          title="Nueva orden"
          onClose={() => { setIsCreateOpen(false); setCreateForm(emptyForm()); }}
          onSubmit={handleCreate}
          form={createForm}
          onChange={updateFormField(setCreateForm)}
          serviceTypes={tenant.serviceTypes}
          statuses={tenant.statuses}
          submitting={submitting}
        />
      )}

      {/* Edit modal */}
      {editTarget && (
        <GarmentModal
          title={`Editar orden #${editTarget.orderNumber}`}
          onClose={() => setEditTarget(null)}
          onSubmit={handleEdit}
          form={editForm}
          onChange={updateFormField(setEditForm)}
          serviceTypes={tenant.serviceTypes}
          statuses={tenant.statuses}
          submitting={submitting}
        />
      )}

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-2">Eliminar orden #{confirmDelete.orderNumber}</h3>
            <p className="text-sm text-muted-foreground mb-5">
              ¿Seguro que querés eliminar la orden de <strong>{confirmDelete.clientName}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg border py-2.5 text-sm hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button onClick={handleDelete} className="flex-1 rounded-lg bg-destructive text-destructive-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status quick-change dropdown placeholder (accessible via edit) */}
      <div className="sr-only" aria-live="polite" />
    </div>
  );
}
