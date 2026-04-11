import { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchGarments, createGarment, updateGarment, deleteGarment } from '../services/api';
import type { DBGarment } from '../services/api';
import { generateTicket } from '../services/generateTicket';
import { useToast } from '../components/ToastContext';
import { BUSINESS } from '../config';
import GarmentModal, { EMPTY_FORM } from '../components/GarmentModal';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Search, SlidersHorizontal, X, Smartphone } from 'lucide-react';

// ─── Hook mobile ────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

// ─── Tipos de arreglo comunes (chips) ────────────────────────────────────────
const COMMON_REPAIR_TYPES = ['dobladillo', 'cierre', 'entalle', 'parche', 'otro'];

// ─── Opciones de orden ────────────────────────────────────────────────────────
type SortOption = 'estado' | 'entrega_asc' | 'ingreso_desc' | 'cliente_az' | 'precio_mayor' | 'precio_menor';
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'estado',       label: 'Estado (default)' },
  { value: 'entrega_asc',  label: 'Fecha entrega ↑' },
  { value: 'ingreso_desc', label: 'Fecha ingreso ↓' },
  { value: 'cliente_az',   label: 'Cliente A-Z' },
  { value: 'precio_mayor', label: 'Precio mayor' },
  { value: 'precio_menor', label: 'Precio menor' },
];

// ─── Status badge helper ─────────────────────────────────────────────────────
function getStatusBadge(status: string) {
  switch (status) {
    case 'recibido':   return <Badge variant="recibido">● Recibido</Badge>;
    case 'en_proceso': return <Badge variant="en_proceso">⚙ En Proceso</Badge>;
    case 'listo':      return <Badge variant="listo">✓ Listo</Badge>;
    case 'entregado':  return <Badge variant="entregado">✔ Entregado</Badge>;
    default:           return null;
  }
}

export default function Garments() {
  const toast = useToast();
  const isMobile = useIsMobile();

  const [searchTerm, setSearchTerm]       = useState('');
  const [statusFilter, setStatusFilter]   = useState<string>('all');
  const [garments, setGarments]           = useState<DBGarment[]>([]);
  const [loading, setLoading]             = useState(true);

  // Filtros avanzados
  const [showFilters, setShowFilters]           = useState(false);
  const [repairTypeFilter, setRepairTypeFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom]                 = useState('');
  const [dateTo, setDateTo]                     = useState('');
  const [onlyOverdue, setOnlyOverdue]           = useState(false);
  const [sortBy, setSortBy]                     = useState<SortOption>('estado');

  // Modal crear
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm]     = useState({ ...EMPTY_FORM });

  // Modal editar
  const [editTarget, setEditTarget] = useState<DBGarment | null>(null);
  const [editForm, setEditForm]     = useState({ ...EMPTY_FORM });

  const load = useCallback(() => {
    setLoading(true);
    fetchGarments()
      .then(data => { setGarments(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const STATUS_ORDER: Record<string, number> = { listo: 0, en_proceso: 1, recibido: 2, entregado: 3 };

  const today     = useMemo(() => new Date().toISOString().split('T')[0], []);
  const isOverdue = (g: DBGarment) => g.deliveryDate < today && g.status !== 'entregado';

  const statusCounts = useMemo(
    () => garments.reduce<Record<string, number>>((acc, g) => {
      acc[g.status] = (acc[g.status] || 0) + 1;
      return acc;
    }, {}),
    [garments]
  );

  // Tipos de arreglo derivados de los datos reales
  const availableRepairTypes = useMemo(() => {
    const types = new Set<string>();
    garments.forEach(g => {
      const t = g.repairType.toLowerCase().trim();
      COMMON_REPAIR_TYPES.forEach(c => { if (t === c) types.add(c); });
      if (!COMMON_REPAIR_TYPES.some(c => c === t)) types.add('otro');
    });
    const all = new Set([...COMMON_REPAIR_TYPES]);
    types.forEach(t => all.add(t));
    return [...all];
  }, [garments]);

  // Conteo de filtros activos
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (repairTypeFilter.length > 0) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (onlyOverdue) count++;
    if (sortBy !== 'estado') count++;
    return count;
  }, [repairTypeFilter, dateFrom, dateTo, onlyOverdue, sortBy]);

  const clearFilters = () => {
    setRepairTypeFilter([]);
    setDateFrom('');
    setDateTo('');
    setOnlyOverdue(false);
    setSortBy('estado');
  };

  const filtered = useMemo(() => {
    let list = garments.filter(g => {
      if (statusFilter !== 'all' && g.status !== statusFilter) return false;
      if (onlyOverdue && !isOverdue(g)) return false;
      if (repairTypeFilter.length > 0) {
        const t = g.repairType.toLowerCase().trim();
        const matchesChip = repairTypeFilter.some(chip =>
          chip === 'otro' ? !COMMON_REPAIR_TYPES.slice(0, -1).includes(t) : t === chip
        );
        if (!matchesChip) return false;
      }
      if (dateFrom && g.deliveryDate < dateFrom) return false;
      if (dateTo   && g.deliveryDate > dateTo)   return false;
      const q = searchTerm.toLowerCase();
      const orderLabel = `ord-${String(g.orderNumber).padStart(3, '0')}`.toLowerCase();
      return !q || g.clientName.toLowerCase().includes(q) ||
        g.garmentName.toLowerCase().includes(q) ||
        g.repairType.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        orderLabel.includes(q) ||
        String(g.orderNumber).includes(q);
    });

    switch (sortBy) {
      case 'entrega_asc':  list = [...list].sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate)); break;
      case 'ingreso_desc': list = [...list].sort((a, b) => (b.intakeDate || '').localeCompare(a.intakeDate || '')); break;
      case 'cliente_az':   list = [...list].sort((a, b) => a.clientName.localeCompare(b.clientName)); break;
      case 'precio_mayor': list = [...list].sort((a, b) => b.price - a.price); break;
      case 'precio_menor': list = [...list].sort((a, b) => a.price - b.price); break;
      default:             list = [...list].sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));
    }
    return list;
  }, [garments, statusFilter, searchTerm, repairTypeFilter, dateFrom, dateTo, onlyOverdue, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const formatDate = (dateStr: string | undefined, withTime = false) => {
    if (!dateStr) return '-';
    if (dateStr.length <= 10) return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-AR');
    return withTime
      ? new Date(dateStr).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : new Date(dateStr).toLocaleDateString('es-AR');
  };

  const ActionButtons = ({ g }: { g: DBGarment }) => (
    <>
      <Button variant="outline" size="sm" onClick={() => openEdit(g)}>
        Editar
      </Button>
      {g.status === 'listo' && (
        <a
          href={`https://wa.me/${g.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(BUSINESS.whatsappReadyMsg(g.clientName, g.garmentName))}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'success', size: 'sm' }), 'no-underline')}
        >
          Avisar
        </a>
      )}
      <Button
        variant="secondary"
        size="sm"
        className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
        onClick={() => generateTicket(g)}
      >
        Ticket
      </Button>
      <Button variant="destructive" size="sm" onClick={() => handleDelete(g.id)}>
        Eliminar
      </Button>
    </>
  );

  if (loading && garments.length === 0) return <SkeletonLoader rows={5} />;

  return (
    <div className={cn('flex flex-col', isMobile ? 'h-auto' : 'h-full')}>

      {/* ── Encabezado ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Prendas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administra los arreglos de tus clientes detalladamente.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          + Registrar Ingreso
        </Button>
      </div>

      {/* ── Filtros de estado ──────────────────────────────────────── */}
      <div className="flex gap-2 mb-4 flex-wrap shrink-0">
        {[
          { key: 'all',        label: 'Todos',      count: garments.length },
          { key: 'recibido',   label: 'Recibido',   count: statusCounts['recibido']   || 0 },
          { key: 'en_proceso', label: 'En Proceso', count: statusCounts['en_proceso'] || 0 },
          { key: 'listo',      label: 'Listo',      count: statusCounts['listo']      || 0 },
          { key: 'entregado',  label: 'Entregado',  count: statusCounts['entregado']  || 0 },
        ].map(({ key, label, count }) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={statusFilter === key ? 'default' : 'outline'}
            onClick={() => setStatusFilter(key)}
          >
            {label} ({count})
          </Button>
        ))}
      </div>

      {/* ── Card contenedor ───────────────────────────────────────── */}
      <div className={cn(
        'rounded-xl border border-border bg-card shadow-sm flex flex-col',
        isMobile ? 'overflow-visible' : 'overflow-hidden flex-1 min-h-0'
      )}>

        {/* Barra de búsqueda + botón Filtros */}
        <div className="flex gap-3 p-4 border-b border-border shrink-0 items-center flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar por cliente, prenda o nro orden..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant={activeFilterCount > 0 ? 'default' : 'outline'}
            className="relative shrink-0"
            onClick={() => setShowFilters(f => !f)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-background text-primary border border-primary rounded-full text-[11px] font-bold leading-none px-1.5 py-0.5 min-w-[18px] text-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Panel de filtros avanzados */}
        {showFilters && (
          <div className="p-4 border-b border-border bg-muted/40 shrink-0">
            {/* Tipo de arreglo */}
            <div className="mb-4">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">
                Tipo de arreglo
              </div>
              <div className="flex flex-wrap gap-2">
                {availableRepairTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setRepairTypeFilter(prev =>
                      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                    )}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer',
                      repairTypeFilter.includes(type)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:bg-muted'
                    )}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Rango de fechas + Vencidos */}
            <div className="flex gap-3 flex-wrap items-end mb-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Entrega desde
                </label>
                <Input
                  type="date"
                  className="w-[150px] h-9 text-sm"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Entrega hasta
                </label>
                <Input
                  type="date"
                  className="w-[150px] h-9 text-sm"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold pb-0.5">
                <input
                  type="checkbox"
                  checked={onlyOverdue}
                  onChange={e => setOnlyOverdue(e.target.checked)}
                  className="accent-primary w-4 h-4"
                />
                Solo vencidos
              </label>
            </div>

            {/* Ordenar por + Limpiar */}
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  Ordenar por
                </label>
                <Select
                  className="w-auto h-9 text-sm"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </div>
              {activeFilterCount > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={clearFilters}
                  className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                >
                  <X className="h-3 w-3" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Vista: Cards (mobile) vs Tabla (desktop) ─────────────── */}
        {isMobile ? (
          /* ── MOBILE: tarjetas ──────────────────────────────────────── */
          <div className="flex flex-col gap-3 p-3">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No se encontraron órdenes.
              </div>
            ) : filtered.map(g => (
              <div
                key={g.id}
                className={cn(
                  'rounded-xl border bg-card shadow-sm overflow-hidden',
                  isOverdue(g) ? 'border-red-200 bg-red-50/30' : 'border-border'
                )}
              >
                {/* Header: ORD + badge */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
                  <span className="font-mono text-xs font-bold text-muted-foreground">
                    ORD-{String(g.orderNumber).padStart(3, '0')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {getStatusBadge(g.status)}
                    {isOverdue(g) && (
                      <Badge variant="overdue">Vencido</Badge>
                    )}
                  </span>
                </div>

                {/* Body */}
                <div className="px-4 py-3">
                  {/* Cliente */}
                  <div className="mb-2">
                    <div className="font-bold text-sm uppercase tracking-wide text-foreground">
                      {g.clientName}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Smartphone className="h-3 w-3" />
                      {g.clientPhone}
                    </div>
                  </div>

                  {/* Prenda */}
                  <div className="mb-2 pb-2 border-b border-border">
                    <div className="font-semibold text-sm text-foreground">
                      {g.garmentName}{' '}
                      <span className="text-muted-foreground font-normal">({g.repairType})</span>
                    </div>
                    {g.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {g.description}
                      </div>
                    )}
                  </div>

                  {/* Fechas */}
                  <div className="flex gap-4 mb-2 text-xs">
                    <div>
                      <span className="text-muted-foreground font-semibold">Ingreso: </span>
                      <span>{formatDate(g.intakeDate, !!g.intakeDate && g.intakeDate.length > 10)}</span>
                    </div>
                    <div>
                      <span className={cn('font-semibold', isOverdue(g) ? 'text-red-600' : 'text-muted-foreground')}>
                        Entrega:{' '}
                      </span>
                      <span className={cn(isOverdue(g) && 'text-red-600 font-bold')}>
                        {formatDate(g.deliveryDate)}
                      </span>
                    </div>
                  </div>

                  {/* Precios */}
                  <div className="flex gap-3 flex-wrap text-xs">
                    <div className="font-bold">Total: ${g.price.toLocaleString()}</div>
                    {g.deposit !== undefined && g.deposit > 0 && (
                      <>
                        <div className="text-emerald-700 font-semibold">Seña: ${g.deposit.toLocaleString()}</div>
                        <div className="text-red-600 font-bold">Saldo: ${(g.price - g.deposit).toLocaleString()}</div>
                      </>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 flex-wrap px-4 py-3 border-t border-border bg-muted/20">
                  <ActionButtons g={g} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── DESKTOP: tabla ────────────────────────────────────────── */
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Prenda & Detalle</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ingreso</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Entrega</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Costo / Saldo</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(g => (
                  <tr
                    key={g.id}
                    className={cn(
                      'border-b border-border hover:bg-muted/30 transition-colors',
                      isOverdue(g) && 'bg-amber-50/50'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold uppercase text-foreground">{g.clientName}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Smartphone className="h-3 w-3" />
                        {g.clientPhone}
                      </div>
                      <div className="text-[11px] text-muted-foreground/60 mt-0.5 font-mono">
                        ORD-{String(g.orderNumber).padStart(3, '0')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{g.garmentName} ({g.repairType})</div>
                      <div className="text-xs text-muted-foreground max-w-[280px] truncate">
                        {g.description}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(g.intakeDate, !!g.intakeDate && g.intakeDate.length > 10)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(g.deliveryDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">Total: ${g.price.toLocaleString()}</div>
                      {g.deposit !== undefined && g.deposit > 0 && (
                        <div className="text-xs text-emerald-700">Seña: ${g.deposit.toLocaleString()}</div>
                      )}
                      {g.deposit !== undefined && g.deposit > 0 && (
                        <div className="text-xs text-red-600 font-semibold">Saldo: ${(g.price - g.deposit).toLocaleString()}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        {getStatusBadge(g.status)}
                        {isOverdue(g) && (
                          <Badge variant="overdue">Vencido</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <ActionButtons g={g} />
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron órdenes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
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
          title={`Editar Orden ORD-${String(editTarget.orderNumber).padStart(3, '0')}`}
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
