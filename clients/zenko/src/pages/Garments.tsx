import { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchGarments, createGarment, updateGarment, deleteGarment, uploadGarmentPhoto, orderTotal } from '../services/api';
import type { DBGarment } from '../services/api';
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

interface GarmentsProps {
  externalSearch?: string;
  createTrigger?: number;
}

export default function Garments({ externalSearch = '', createTrigger = 0 }: GarmentsProps) {
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

  // Sync búsqueda global desde el header
  useEffect(() => { setSearchTerm(externalSearch); }, [externalSearch]);

  // FAB → abrir modal de nueva orden
  useEffect(() => { if (createTrigger > 0) setIsCreateOpen(true); }, [createTrigger]);

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

  // Tipos de arreglo derivados de los items reales
  const availableRepairTypes = useMemo(() => {
    const types = new Set<string>();
    garments.forEach(g => (g.items ?? []).forEach(item => {
      const t = item.repairType.toLowerCase().trim();
      COMMON_REPAIR_TYPES.forEach(c => { if (t === c) types.add(c); });
      if (!COMMON_REPAIR_TYPES.some(c => c === t)) types.add('otro');
    }));
    const all = new Set([...COMMON_REPAIR_TYPES]);
    types.forEach(t => all.add(t));
    return [...all];
  }, [garments]);

  // Panel "Hoy"
  const todayPending = useMemo(
    () => garments.filter(g => g.deliveryDate === today && g.status !== 'entregado'),
    [garments, today]
  );
  const staleReady = useMemo(
    () => garments.filter(g => g.status === 'listo' && g.deliveryDate < today),
    [garments, today]
  );

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
        const itemTypes = (g.items ?? []).map(i => i.repairType.toLowerCase().trim());
        const matchesChip = repairTypeFilter.some(chip =>
          chip === 'otro'
            ? itemTypes.some(t => !COMMON_REPAIR_TYPES.slice(0, -1).includes(t))
            : itemTypes.includes(chip)
        );
        if (!matchesChip) return false;
      }
      if (dateFrom && g.deliveryDate < dateFrom) return false;
      if (dateTo   && g.deliveryDate > dateTo)   return false;
      const q = searchTerm.toLowerCase();
      const orderLabel = `ord-${String(g.orderNumber).padStart(6, '0')}`.toLowerCase();
      if (!q) return true;
      if (g.clientName.toLowerCase().includes(q) || orderLabel.includes(q) || String(g.orderNumber).includes(q)) return true;
      return (g.items ?? []).some(item =>
        item.garmentName.toLowerCase().includes(q) ||
        item.repairType.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });

    switch (sortBy) {
      case 'entrega_asc':  list = [...list].sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate)); break;
      case 'ingreso_desc': list = [...list].sort((a, b) => (b.intakeDate || '').localeCompare(a.intakeDate || '')); break;
      case 'cliente_az':   list = [...list].sort((a, b) => a.clientName.localeCompare(b.clientName)); break;
      case 'precio_mayor': list = [...list].sort((a, b) => orderTotal(b) - orderTotal(a)); break;
      case 'precio_menor': list = [...list].sort((a, b) => orderTotal(a) - orderTotal(b)); break;
      default:             list = [...list].sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));
    }
    return list;
  }, [garments, statusFilter, searchTerm, repairTypeFilter, dateFrom, dateTo, onlyOverdue, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e: React.FormEvent, capturedPhotos?: File[]) => {
    e.preventDefault();
    if (!createForm.deliveryDate) {
      toast.error('Ingresá la fecha de entrega');
      return;
    }
    const items = (createForm.items && createForm.items.length > 0)
      ? createForm.items
      : [{ garmentName: createForm.garmentName, repairType: createForm.repairType, description: createForm.description, price: Number(createForm.price) }];
    try {
      const created = await createGarment({
        clientName: createForm.clientName,
        clientPhone: createForm.clientPhone,
        intakeDate: createForm.intakeDate,
        deliveryDate: createForm.deliveryDate,
        status: createForm.status,
        location: createForm.location,
        deposit: Number(createForm.deposit || 0),
        items: items.map(item => ({
          garmentName: item.garmentName,
          repairType: item.repairType,
          description: item.description || '',
          price: Number(item.price),
        })),
      });
      if (created?.id) {
        const { generateTicket } = await import('../services/generateTicket');
        generateTicket(created).catch(() => {});
        if (capturedPhotos && capturedPhotos.length > 0) {
          for (const photo of capturedPhotos) {
            await uploadGarmentPhoto(created.id, photo).catch(() => {});
          }
        }
      }
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
      garmentName: '', repairType: '', description: '',
      intakeDate: g.intakeDate || '', deliveryDate: g.deliveryDate,
      price: 0, deposit: g.deposit || 0, status: g.status, location: g.location || '',
      items: (g.items ?? []).map(item => ({
        garmentName: item.garmentName,
        repairType: item.repairType,
        description: item.description,
        price: item.price,
        deposit: 0,
      })),
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    const items = (editForm.items && editForm.items.length > 0)
      ? editForm.items
      : [{ garmentName: editForm.garmentName, repairType: editForm.repairType, description: editForm.description, price: Number(editForm.price) }];
    try {
      await updateGarment(editTarget.id, {
        clientName: editForm.clientName,
        clientPhone: editForm.clientPhone,
        intakeDate: editForm.intakeDate,
        deliveryDate: editForm.deliveryDate,
        status: editForm.status,
        location: editForm.location,
        deposit: Number(editForm.deposit || 0),
        items: items.map(item => ({
          garmentName: item.garmentName,
          repairType: item.repairType,
          description: item.description || '',
          price: Number(item.price),
        })),
      });
      toast.success('Orden actualizada correctamente');
      setEditTarget(null);
      load();
    } catch {
      toast.error('Error al actualizar la orden');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('¿El cliente canceló el pedido? La orden será eliminada del sistema.')) return;
    try {
      await deleteGarment(id);
      toast.success('Pedido cancelado');
      load();
    } catch {
      toast.error('Error al cancelar el pedido');
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
          href={`https://wa.me/${g.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(BUSINESS.whatsappReadyMsg(g.clientName, (g.items ?? []).map(i => i.garmentName).join(', ') || 'pedido'))}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'success', size: 'sm' }), 'no-underline')}
        >
          Avisar
        </a>
      )}
      <Button
        variant="info"
        size="sm"
        onClick={async () => {
          const { generateTicket } = await import('../services/generateTicket');
          generateTicket(g);
        }}
      >
        Ticket
      </Button>
      {g.status !== 'entregado' && (
        <Button variant="destructive" size="sm" onClick={() => handleCancel(g.id)}>
          Cancelar pedido
        </Button>
      )}
    </>
  );

  if (loading && garments.length === 0) return <SkeletonLoader rows={5} />;

  return (
    <div className={cn('flex flex-col', isMobile ? 'h-auto' : 'h-full')}>

      {/* ── Encabezado ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Gestión de Prendas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administra los arreglos de tus clientes detalladamente.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="shrink-0 self-start">
          + Registrar Ingreso
        </Button>
      </div>

      {/* ── Panel "Hoy" ───────────────────────────────────────────── */}
      {(todayPending.length > 0 || staleReady.length > 0) && (
        <div className="flex gap-2 mb-3 flex-wrap shrink-0">
          {todayPending.length > 0 && (
            <button
              type="button"
              onClick={() => { setDateFrom(today); setDateTo(today); setStatusFilter('all'); setOnlyOverdue(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
            >
              📅 {todayPending.length} entrega{todayPending.length > 1 ? 's' : ''} hoy
            </button>
          )}
          {staleReady.length > 0 && (
            <button
              type="button"
              onClick={() => { setStatusFilter('listo'); setOnlyOverdue(true); setDateFrom(''); setDateTo(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-semibold hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors"
            >
              ⏰ {staleReady.length} lista{staleReady.length > 1 ? 's' : ''} sin retirar
            </button>
          )}
        </div>
      )}

      {/* ── Filtros de estado ──────────────────────────────────────── */}
      <div className="flex gap-2 mb-4 flex-wrap shrink-0">
        {[
          { key: 'all',        label: 'Todos',      count: garments.length,               color: '' },
          { key: 'recibido',   label: 'Recibido',   count: statusCounts['recibido']   || 0, color: 'border-slate-400 data-active:bg-slate-500' },
          { key: 'en_proceso', label: 'En Proceso', count: statusCounts['en_proceso'] || 0, color: 'border-blue-400' },
          { key: 'listo',      label: 'Listo',      count: statusCounts['listo']      || 0, color: 'border-green-400' },
          { key: 'entregado',  label: 'Entregado',  count: statusCounts['entregado']  || 0, color: 'border-purple-400' },
        ].map(({ key, label, count, color }) => {
          const isActive = statusFilter === key;
          const colorMap: Record<string, { active: string; inactive: string }> = {
            '':                   { active: 'bg-foreground text-background border-foreground', inactive: 'border-border text-muted-foreground hover:border-foreground hover:text-foreground' },
            'border-slate-400 data-active:bg-slate-500': { active: 'bg-slate-500 text-white border-slate-500', inactive: 'border-slate-300 text-slate-600 dark:text-slate-400 hover:border-slate-500' },
            'border-blue-400':    { active: 'bg-blue-500 text-white border-blue-500', inactive: 'border-blue-300 text-blue-600 dark:text-blue-400 hover:border-blue-500' },
            'border-green-400':   { active: 'bg-green-500 text-white border-green-500', inactive: 'border-green-300 text-green-600 dark:text-green-400 hover:border-green-500' },
            'border-purple-400':  { active: 'bg-purple-500 text-white border-purple-500', inactive: 'border-purple-300 text-purple-600 dark:text-purple-400 hover:border-purple-500' },
          };
          const styles = colorMap[color] ?? colorMap[''];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={cn(
                'px-3 py-1 rounded-full border text-xs font-semibold transition-colors cursor-pointer',
                isActive ? styles.active : styles.inactive
              )}
            >
              {label} ({count})
            </button>
          );
        })}
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
                  className="dark:bg-red-950/30 dark:text-red-400 dark:border-red-900 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:hover:bg-red-950/50"
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
                    ORD-{String(g.orderNumber).padStart(6, '0')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {getStatusBadge(g.status)}
                    {isOverdue(g) && (
                      <Badge variant="overdue">Vencido</Badge>
                    )}
                    {!!g.scanCount && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5" title={`Consultado ${g.scanCount} ${g.scanCount === 1 ? 'vez' : 'veces'} por el cliente`}>
                        👁 {g.scanCount}
                      </span>
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

                  {/* Prendas */}
                  <div className="mb-2 pb-2 border-b border-border space-y-1">
                    {(g.items ?? []).map((item, idx) => (
                      <div key={idx}>
                        <div className="font-semibold text-sm text-foreground">
                          {item.garmentName}{' '}
                          <span className="text-muted-foreground font-normal">({item.repairType})</span>
                        </div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        )}
                      </div>
                    ))}
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
                  {(() => { const total = orderTotal(g); const saldo = total - (g.deposit ?? 0); return (
                    <div className="flex gap-3 flex-wrap text-xs">
                      <div className="font-bold">Total: ${total.toLocaleString()}</div>
                      {g.deposit !== undefined && g.deposit > 0 && (
                        <>
                          <div className="text-status-positive font-semibold">Seña: ${g.deposit.toLocaleString()}</div>
                          <div className="text-status-negative font-bold">Saldo: ${saldo.toLocaleString()}</div>
                        </>
                      )}
                    </div>
                  ); })()}
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
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-1/4">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-1/3">Prenda & Detalle</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap w-[1%]">Ingreso</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap w-[1%]">Entrega</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap w-[1%]">Costo / Saldo</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap w-[1%]">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap w-[1%]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(g => (
                  <tr
                    key={g.id}
                    className={cn(
                      'border-b border-border hover:bg-muted/30 transition-colors',
                      isOverdue(g) && 'bg-amber-50/50 dark:bg-amber-950/20'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold uppercase text-foreground">{g.clientName}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Smartphone className="h-3 w-3" />
                        {g.clientPhone}
                      </div>
                      <div className="text-[11px] text-muted-foreground/60 mt-0.5 font-mono">
                        ORD-{String(g.orderNumber).padStart(6, '0')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(g.items ?? []).map((item, idx) => (
                        <div key={idx} className={idx > 0 ? 'mt-1 pt-1 border-t border-border/50' : ''}>
                          <div className="font-semibold text-foreground text-sm">{item.garmentName} <span className="text-muted-foreground font-normal">({item.repairType})</span></div>
                          {item.description && <div className="text-xs text-muted-foreground">{item.description}</div>}
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(g.intakeDate, !!g.intakeDate && g.intakeDate.length > 10)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(g.deliveryDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(() => { const total = orderTotal(g); return (<>
                        <div className="font-semibold text-foreground">Total: ${total.toLocaleString()}</div>
                        {g.deposit !== undefined && g.deposit > 0 && (<>
                          <div className="text-xs text-status-positive">Seña: ${g.deposit.toLocaleString()}</div>
                          <div className="text-xs text-status-negative font-semibold">Saldo: ${(total - g.deposit).toLocaleString()}</div>
                        </>)}
                      </>); })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        {getStatusBadge(g.status)}
                        {isOverdue(g) && (
                          <Badge variant="overdue">Vencido</Badge>
                        )}
                        {!!g.scanCount && (
                          <span className="text-[10px] text-muted-foreground" title={`Consultado ${g.scanCount} veces`}>
                            👁 {g.scanCount} consultas
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
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
          garmentHistory={garments}
        />
      )}

      {/* Modal Editar */}
      {editTarget && (
        <GarmentModal
          title={`Editar Orden ORD-${String(editTarget.orderNumber).padStart(6, '0')}`}
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
