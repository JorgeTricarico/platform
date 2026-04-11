import { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchGarments, createGarment, updateGarment, deleteGarment } from '../services/api';
import type { DBGarment } from '../services/api';
import { generateTicket } from '../services/generateTicket';
import { useToast } from '../components/ToastContext';
import { BUSINESS } from '../config';
import GarmentModal, { EMPTY_FORM } from '../components/GarmentModal';
import { SkeletonLoader } from '../components/SkeletonLoader';

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
    // Siempre mostrar los comunes + los que aparezcan en los datos
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

  const badgeStyle = (bg: string, fg: string, bd: string): React.CSSProperties => ({
    background: bg, color: fg, border: `1px solid ${bd}`, whiteSpace: 'nowrap',
    display: 'inline-block', fontSize: '12px', padding: '4px 10px',
    borderRadius: '12px', fontWeight: 600
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'recibido':   return <span style={badgeStyle('#fff3e0', '#e65100', '#ffcc80')}>● Recibido</span>;
      case 'en_proceso': return <span style={badgeStyle('#e3f2fd', '#1565c0', '#90caf9')}>⚙ En Proceso</span>;
      case 'listo':      return <span style={badgeStyle('#e8f5e9', '#2e7d32', '#a5d6a7')}>✓ Listo</span>;
      case 'entregado':  return <span style={badgeStyle('#f5f5f5', '#757575', '#e0e0e0')}>✔ Entregado</span>;
      default:           return null;
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
    </>
  );

  if (loading && garments.length === 0) return <SkeletonLoader rows={5} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Encabezado ─────────────────────────────────────────────── */}
      <div className="flex-between" style={{ marginBottom: '20px', flexShrink: 0 }}>
        <div>
          <h1>Gestión de Prendas</h1>
          <p className="subtitle" style={{ margin: 0, fontSize: '14px' }}>
            Administra los arreglos de tus clientes detalladamente.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
          + Registrar Ingreso
        </button>
      </div>

      {/* ── Filtros de estado ──────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', flexShrink: 0 }}>
        {[
          { key: 'all',        label: 'Todos',     count: garments.length },
          { key: 'recibido',   label: 'Recibido',  count: statusCounts['recibido']   || 0 },
          { key: 'en_proceso', label: 'En Proceso', count: statusCounts['en_proceso'] || 0 },
          { key: 'listo',      label: 'Listo',     count: statusCounts['listo']      || 0 },
          { key: 'entregado',  label: 'Entregado', count: statusCounts['entregado']  || 0 },
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

      {/* ── Card contenedor ───────────────────────────────────────── */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

        {/* Barra de búsqueda + botón Filtros */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Buscar por cliente, prenda o nro orden..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-search"
            style={{ flex: 1, minWidth: '180px' }}
          />
          <button
            type="button"
            className="btn btn-small"
            onClick={() => setShowFilters(f => !f)}
            style={{
              backgroundColor: activeFilterCount > 0 ? 'var(--primary-color)' : 'var(--surface-secondary)',
              color: activeFilterCount > 0 ? 'white' : 'var(--text-primary)',
              border: activeFilterCount > 0 ? 'none' : '1px solid var(--border-color)',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            ⚙ Filtros
            {activeFilterCount > 0 && (
              <span style={{
                position: 'absolute', top: '-6px', right: '-6px',
                background: '#fff', color: 'var(--primary-color)',
                border: '1.5px solid var(--primary-color)',
                borderRadius: '99px', fontSize: '11px', fontWeight: 700,
                lineHeight: 1, padding: '1px 5px', minWidth: '16px', textAlign: 'center',
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Panel de filtros avanzados */}
        {showFilters && (
          <div className="filter-panel">
            {/* Tipo de arreglo */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Tipo de arreglo
              </div>
              <div className="filter-chips">
                {availableRepairTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    className={`filter-chip${repairTypeFilter.includes(type) ? ' active' : ''}`}
                    onClick={() => setRepairTypeFilter(prev =>
                      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                    )}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Rango de fechas + Vencidos */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Entrega desde
                </label>
                <input
                  type="date"
                  className="input"
                  style={{ width: '150px', padding: '7px 10px', fontSize: '13px' }}
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Entrega hasta
                </label>
                <input
                  type="date"
                  className="input"
                  style={{ width: '150px', padding: '7px 10px', fontSize: '13px' }}
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, paddingBottom: '2px' }}>
                <input
                  type="checkbox"
                  checked={onlyOverdue}
                  onChange={e => setOnlyOverdue(e.target.checked)}
                  style={{ accentColor: 'var(--primary-color)', width: '16px', height: '16px' }}
                />
                Solo vencidos
              </label>
            </div>

            {/* Ordenar por + Limpiar */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  Ordenar por
                </label>
                <select
                  className="input"
                  style={{ width: 'auto', padding: '7px 10px', fontSize: '13px', cursor: 'pointer' }}
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={clearFilters}
                  style={{ backgroundColor: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000' }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Vista: Cards (mobile) vs Tabla (desktop) ─────────────── */}
        {isMobile ? (
          /* ── MOBILE: tarjetas ──────────────────────────────────────── */
          <div className="garment-cards">
            {filtered.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No se encontraron órdenes.
              </div>
            ) : filtered.map(g => (
              <div key={g.id} className={`garment-card${isOverdue(g) ? ' overdue' : ''}`}>

                {/* Header: ORD + badge */}
                <div className="garment-card-header">
                  <span className="garment-card-ord">
                    ORD-{String(g.orderNumber).padStart(3, '0')}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {getStatusBadge(g.status)}
                    {isOverdue(g) && (
                      <span style={{ fontSize: '11px', color: '#d32f2f', fontWeight: 700, background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: '8px', padding: '2px 7px' }}>
                        Vencido
                      </span>
                    )}
                  </span>
                </div>

                {/* Body */}
                <div className="garment-card-body">
                  {/* Cliente */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                      {g.clientName}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
                      </svg>
                      {g.clientPhone}
                    </div>
                  </div>

                  {/* Prenda */}
                  <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                      {g.garmentName} <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>({g.repairType})</span>
                    </div>
                    {g.description && (
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {g.description}
                      </div>
                    )}
                  </div>

                  {/* Fechas */}
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Ingreso: </span>
                      <span>{formatDate(g.intakeDate, !!g.intakeDate && g.intakeDate.length > 10)}</span>
                    </div>
                    <div>
                      <span style={{ color: isOverdue(g) ? '#d32f2f' : 'var(--text-secondary)', fontWeight: 600 }}>Entrega: </span>
                      <span style={{ color: isOverdue(g) ? '#d32f2f' : 'inherit', fontWeight: isOverdue(g) ? 700 : 500 }}>
                        {formatDate(g.deliveryDate)}
                      </span>
                    </div>
                  </div>

                  {/* Precios */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '13px' }}>
                    <div style={{ fontWeight: 700 }}>Total: ${g.price.toLocaleString()}</div>
                    {g.deposit !== undefined && g.deposit > 0 && (
                      <>
                        <div style={{ color: '#689f38', fontWeight: 600 }}>Seña: ${g.deposit.toLocaleString()}</div>
                        <div style={{ color: '#d32f2f', fontWeight: 700 }}>Saldo: ${(g.price - g.deposit).toLocaleString()}</div>
                      </>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="garment-card-actions">
                  <ActionButtons g={g} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── DESKTOP: tabla ────────────────────────────────────────── */
          <div className="table-container">
            <table>
              <thead>
                <tr>
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
                    <td>
                      <div style={{ fontWeight: 600, textTransform: 'uppercase' }}>{g.clientName}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
                        </svg>
                        {g.clientPhone}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.6, marginTop: '2px', fontFamily: 'monospace' }}>
                        ORD-{String(g.orderNumber).padStart(3, '0')}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{g.garmentName} ({g.repairType})</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {g.description}
                      </div>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {formatDate(g.intakeDate, !!g.intakeDate && g.intakeDate.length > 10)}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {formatDate(g.deliveryDate)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>Total: ${g.price.toLocaleString()}</div>
                      {g.deposit !== undefined && g.deposit > 0 && (
                        <div style={{ fontSize: '12px', color: '#689f38' }}>Seña: ${g.deposit.toLocaleString()}</div>
                      )}
                      {g.deposit !== undefined && g.deposit > 0 && (
                        <div style={{ fontSize: '12px', color: '#d32f2f', fontWeight: 600 }}>Saldo: ${(g.price - g.deposit).toLocaleString()}</div>
                      )}
                    </td>
                    <td>
                      {getStatusBadge(g.status)}
                      {isOverdue(g) && (
                        <span style={{ display: 'block', fontSize: '11px', color: '#d32f2f', fontWeight: 600, marginTop: '2px' }}>
                          Vencido
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <ActionButtons g={g} />
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
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
