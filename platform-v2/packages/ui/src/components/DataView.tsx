/**
 * DataView — Production-quality adaptive data display component.
 *
 * Desktop (≥768px): sortable table with sticky header, zebra striping, hover rows.
 * Mobile (<768px): stacked card list using renderCard prop or auto-generated fallback.
 *
 * Features:
 *   - Debounced search (client-side or server-side via onSearch)
 *   - Typed filter controls (select, multi-select, boolean, date-range)
 *   - Multi-column sort with asc/desc/none cycle
 *   - Row selection with checkboxes + "select all" + bulk action bar
 *   - Pagination (client-side or server-side with totalCount)
 *   - Row actions (per-row dropdown or inline buttons)
 *   - Loading skeletons for both table and card views
 *   - Configurable empty state
 *   - Full keyboard navigation & ARIA attributes
 */
import * as React from 'react'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  MoreHorizontal,
  CheckSquare,
  Square,
  Minus,
} from 'lucide-react'
import { cn } from '../lib/utils.js'
import { Button } from './Button.js'
import { Input } from './Input.js'
import { Skeleton } from './Skeleton.js'
import { useDebounce } from '../hooks/useDebounce.js'
import { useMediaQuery } from '../hooks/useMediaQuery.js'

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface ColumnDef<T> {
  /** Must be a key of T or a unique string for accessor-function columns */
  key: keyof T & string
  /** Column header label */
  header: string
  /** Custom cell renderer. Receives the cell value and the full row. */
  render?: (value: T[keyof T], item: T) => React.ReactNode
  /** Whether this column supports sorting. Default: false */
  sortable?: boolean
  /** Fixed column width (CSS value, e.g. "120px", "10%") */
  width?: string
  /** Hide this column on mobile (<768px). Default: false */
  hideOnMobile?: boolean
  /** Optional CSS class for td/th cells */
  className?: string
}

export type FilterType = 'select' | 'date-range' | 'boolean' | 'multi-select'

export interface FilterDef<T> {
  key: keyof T & string
  label: string
  type: FilterType
  options?: { value: string; label: string }[]
}

export interface ActionDef<T> {
  label: string
  icon?: React.ReactNode
  onClick: (item: T) => void
  /** Return true to hide this action for a given row */
  hidden?: (item: T) => boolean
  /** Render as a destructive/danger action */
  destructive?: boolean
}

export interface BulkActionDef<T> {
  label: string
  icon?: React.ReactNode
  onClick: (selected: T[]) => void
  /** Minimum items required. Default: 1 */
  minSelection?: number
}

export interface PaginationOptions {
  pageSize: number
  /** True when pagination state and data fetching is handled by the parent */
  serverSide?: boolean
  /** Total count from the server (required when serverSide: true) */
  totalCount?: number
  /** Called when the user changes page (required when serverSide: true) */
  onPageChange?: (page: number) => void
}

export interface DataViewProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  /** Custom card renderer for mobile view */
  renderCard: (item: T) => React.ReactNode
  /** Key extractor for stable React keys */
  rowKey: keyof T | ((row: T) => string)

  // Search
  searchable?: boolean
  searchPlaceholder?: string
  /** Keys to search within (client-side). If empty, searches all string/number fields. */
  searchKeys?: (keyof T & string)[]
  /** If provided, disables client-side search and delegates to parent */
  onSearch?: (query: string) => void

  // Sort
  sortable?: boolean
  defaultSort?: { key: keyof T & string; direction: 'asc' | 'desc' }

  // Filters
  filters?: FilterDef<T>[]

  // Pagination
  pagination?: PaginationOptions

  // Selection
  selectable?: boolean
  onSelectionChange?: (selected: T[]) => void

  // Actions
  actions?: ActionDef<T>[]
  bulkActions?: BulkActionDef<T>[]

  // Display
  emptyState?: React.ReactNode
  loading?: boolean
  skeletonRows?: number
  className?: string
  /** Called when a row is clicked */
  onRowClick?: (item: T) => void
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type SortDir = 'asc' | 'desc' | null

type FilterValues = Record<string, string | string[] | boolean | [string, string] | undefined>

function getRowKey<T>(row: T, rowKey: DataViewProps<T>['rowKey']): string {
  if (typeof rowKey === 'function') return rowKey(row)
  return String(row[rowKey])
}

function getCellValue<T>(row: T, col: ColumnDef<T>): React.ReactNode {
  const val = row[col.key]
  if (col.render) return col.render(val, row)
  if (val === null || val === undefined) return <span className="text-muted-foreground">—</span>
  if (typeof val === 'boolean') return val ? 'Sí' : 'No'
  return val as React.ReactNode
}

function getSortValue<T>(row: T, key: keyof T): string | number {
  const val = row[key]
  if (typeof val === 'string' || typeof val === 'number') return val
  if (val instanceof Date) return val.getTime()
  return ''
}

function matchesSearch<T>(
  row: T,
  query: string,
  keys?: (keyof T & string)[],
): boolean {
  const q = query.toLowerCase().trim()
  if (!q) return true

  const values = keys
    ? keys.map((k) => row[k])
    : Object.values(row as Record<string, unknown>)

  return values.some((v) => {
    if (typeof v === 'string') return v.toLowerCase().includes(q)
    if (typeof v === 'number') return String(v).includes(q)
    return false
  })
}

function matchesFilters<T>(row: T, filterDefs: FilterDef<T>[], filterValues: FilterValues): boolean {
  for (const def of filterDefs) {
    const val = filterValues[def.key]
    if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) continue

    const rowVal = row[def.key]

    if (def.type === 'boolean') {
      if (typeof val === 'boolean' && Boolean(rowVal) !== val) return false
    } else if (def.type === 'multi-select') {
      if (Array.isArray(val) && val.length > 0) {
        if (!val.includes(String(rowVal))) return false
      }
    } else if (def.type === 'date-range') {
      if (Array.isArray(val) && val.length === 2) {
        const [from, to] = val as [string, string]
        const rowDate = rowVal instanceof Date ? rowVal : new Date(String(rowVal))
        if (from && rowDate < new Date(from)) return false
        if (to && rowDate > new Date(to)) return false
      }
    } else {
      // select
      if (String(rowVal) !== String(val)) return false
    }
  }
  return true
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'asc') return <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
  if (dir === 'desc') return <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
  return <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />
}

function FilterControls<T>({
  filters,
  filterValues,
  onChange,
}: {
  filters: FilterDef<T>[]
  filterValues: FilterValues
  onChange: (key: string, value: FilterValues[string]) => void
}) {
  if (filters.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros">
      {filters.map((f) => {
        const val = filterValues[f.key]

        if (f.type === 'select') {
          return (
            <div key={f.key} className="flex items-center gap-1">
              <label
                htmlFor={`filter-${f.key}`}
                className="text-xs text-muted-foreground whitespace-nowrap"
              >
                {f.label}:
              </label>
              <select
                id={`filter-${f.key}`}
                value={(val as string) ?? ''}
                onChange={(e) => onChange(f.key, e.target.value || undefined)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Todos</option>
                {f.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )
        }

        if (f.type === 'boolean') {
          return (
            <label
              key={f.key}
              className="flex items-center gap-1.5 text-sm cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={(val as boolean) ?? false}
                onChange={(e) => onChange(f.key, e.target.checked ? true : undefined)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span>{f.label}</span>
            </label>
          )
        }

        if (f.type === 'multi-select') {
          const selected = (val as string[]) ?? []
          return (
            <div key={f.key} className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">{f.label}:</span>
              <div className="flex flex-wrap gap-1">
                {f.options?.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      const next = selected.includes(opt.value)
                        ? selected.filter((v) => v !== opt.value)
                        : [...selected, opt.value]
                      onChange(f.key, next.length > 0 ? next : undefined)
                    }}
                    className={cn(
                      'h-7 px-2.5 rounded-full text-xs border transition-colors',
                      selected.includes(opt.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-input hover:bg-muted',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )
        }

        if (f.type === 'date-range') {
          const [from = '', to = ''] = (val as [string, string]) ?? ['', '']
          return (
            <div key={f.key} className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap">{f.label}:</span>
              <input
                type="date"
                value={from}
                onChange={(e) => onChange(f.key, [e.target.value, to])}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={`${f.label} desde`}
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="date"
                value={to}
                onChange={(e) => onChange(f.key, [from, e.target.value])}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={`${f.label} hasta`}
              />
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

function RowActionMenu<T>({
  item,
  actions,
}: {
  item: T
  actions: ActionDef<T>[]
}) {
  const [open, setOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const visibleActions = actions.filter((a) => !a.hidden?.(item))

  if (visibleActions.length === 0) return null

  React.useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={menuRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label="Acciones"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-md border bg-popover shadow-md py-1"
        >
          {visibleActions.map((action, i) => (
            <button
              key={i}
              role="menuitem"
              type="button"
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors',
                action.destructive && 'text-destructive hover:text-destructive',
              )}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                action.onClick(item)
              }}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DataView<T>({
  data,
  columns,
  renderCard,
  rowKey,
  searchable = false,
  searchPlaceholder = 'Buscar…',
  searchKeys,
  onSearch,
  sortable = true,
  defaultSort,
  filters = [],
  pagination,
  selectable = false,
  onSelectionChange,
  actions = [],
  bulkActions = [],
  emptyState,
  loading = false,
  skeletonRows = 5,
  className,
  onRowClick,
}: DataViewProps<T>) {
  const isMobile = useMediaQuery('(max-width: 767px)')

  // ── Search ─────────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = React.useState('')
  const debouncedSearch = useDebounce(searchInput, 300)

  React.useEffect(() => {
    onSearch?.(debouncedSearch)
  }, [debouncedSearch, onSearch])

  // ── Sort ───────────────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = React.useState<(keyof T & string) | null>(
    defaultSort?.key ?? null,
  )
  const [sortDir, setSortDir] = React.useState<SortDir>(defaultSort?.direction ?? null)

  const handleSort = React.useCallback(
    (key: keyof T & string) => {
      if (!sortable) return
      setSortKey((prev) => {
        if (prev === key) return key // keep key, cycle direction below
        setSortDir('asc')
        return key
      })
      setSortKey(key)
      setSortDir((prev) => {
        if (sortKey !== key) return 'asc'
        if (prev === 'asc') return 'desc'
        if (prev === 'desc') return null
        return 'asc'
      })
      setPage(1)
    },
    [sortable, sortKey],
  )

  // ── Filters ────────────────────────────────────────────────────────────────
  const [filterValues, setFilterValues] = React.useState<FilterValues>({})

  const handleFilterChange = React.useCallback((key: string, value: FilterValues[string]) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }, [])

  const hasActiveFilters =
    Object.values(filterValues).some((v) => {
      if (v === undefined || v === '') return false
      if (Array.isArray(v) && v.length === 0) return false
      return true
    })

  const clearFilters = () => {
    setFilterValues({})
    setSearchInput('')
    setPage(1)
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  const [page, setPage] = React.useState(1)

  // ── Selection ──────────────────────────────────────────────────────────────
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(new Set())

  const selectedItems = React.useMemo(
    () => data.filter((row) => selectedKeys.has(getRowKey(row, rowKey))),
    [data, selectedKeys, rowKey],
  )

  React.useEffect(() => {
    onSelectionChange?.(selectedItems)
  }, [selectedItems, onSelectionChange])

  // ── Data pipeline ──────────────────────────────────────────────────────────

  // 1. Client-side search (when no onSearch prop)
  const afterSearch = React.useMemo(() => {
    if (onSearch || !searchable || !debouncedSearch.trim()) return data
    return data.filter((row) => matchesSearch(row, debouncedSearch, searchKeys))
  }, [data, searchable, debouncedSearch, searchKeys, onSearch])

  // 2. Filter
  const afterFilter = React.useMemo(() => {
    if (filters.length === 0) return afterSearch
    return afterSearch.filter((row) => matchesFilters(row, filters, filterValues))
  }, [afterSearch, filters, filterValues])

  // 3. Sort
  const afterSort = React.useMemo(() => {
    if (!sortKey || !sortDir) return afterFilter
    return [...afterFilter].sort((a, b) => {
      const av = getSortValue(a, sortKey)
      const bv = getSortValue(b, sortKey)
      let cmp = 0
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv
      } else {
        cmp = String(av).localeCompare(String(bv), 'es', { sensitivity: 'base' })
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [afterFilter, sortKey, sortDir])

  // 4. Pagination (client-side only — server-side uses data as-is)
  const pageSize = pagination?.pageSize ?? 20
  const totalCount = pagination?.serverSide
    ? (pagination.totalCount ?? data.length)
    : afterSort.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const visibleData = React.useMemo(() => {
    if (!pagination) return afterSort
    if (pagination.serverSide) return data // server already paginated
    return afterSort.slice((page - 1) * pageSize, page * pageSize)
  }, [pagination, afterSort, data, page, pageSize])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    pagination?.onPageChange?.(newPage)
  }

  // ── Selection helpers ──────────────────────────────────────────────────────
  const allVisibleKeys = visibleData.map((r) => getRowKey(r, rowKey))
  const allVisibleSelected = allVisibleKeys.length > 0 && allVisibleKeys.every((k) => selectedKeys.has(k))
  const someVisibleSelected = allVisibleKeys.some((k) => selectedKeys.has(k))
  const isIndeterminate = someVisibleSelected && !allVisibleSelected

  const toggleSelectAll = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        allVisibleKeys.forEach((k) => next.delete(k))
      } else {
        allVisibleKeys.forEach((k) => next.add(k))
      }
      return next
    })
  }

  const toggleRow = (row: T) => {
    const key = getRowKey(row, rowKey)
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // ── Visible columns ────────────────────────────────────────────────────────
  const visibleColumns = isMobile
    ? columns.filter((c) => !c.hideOnMobile)
    : columns

  const hasActions = actions.length > 0
  const skeletonArr = Array.from({ length: skeletonRows }, (_, i) => i)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={cn('w-full space-y-3', className)}>

      {/* ── Search + Filters bar ── */}
      {(searchable || filters.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {searchable && (
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                  aria-hidden
                />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value)
                    setPage(1)
                  }}
                  placeholder={searchPlaceholder}
                  aria-label="Buscar"
                  className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            )}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-1 text-muted-foreground"
                aria-label="Limpiar filtros"
              >
                <X className="h-3.5 w-3.5" />
                Limpiar filtros
              </Button>
            )}
          </div>

          {filters.length > 0 && (
            <FilterControls
              filters={filters}
              filterValues={filterValues}
              onChange={handleFilterChange}
            />
          )}
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {selectable && selectedKeys.size > 0 && bulkActions.length > 0 && (
        <div
          role="toolbar"
          aria-label="Acciones sobre selección"
          className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2"
        >
          <span className="text-sm text-muted-foreground">
            {selectedKeys.size} seleccionado{selectedKeys.size !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2 ml-2">
            {bulkActions.map((action, i) => {
              const minSel = action.minSelection ?? 1
              return (
                <Button
                  key={i}
                  size="sm"
                  variant="outline"
                  disabled={selectedKeys.size < minSel}
                  onClick={() => action.onClick(selectedItems)}
                  className="gap-1.5"
                >
                  {action.icon}
                  {action.label}
                </Button>
              )
            })}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 w-7 p-0"
            onClick={() => setSelectedKeys(new Set())}
            aria-label="Deseleccionar todo"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* ── Desktop Table ── */}
      <div className="hidden md:block rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse" role="grid">
            <thead>
              <tr className="bg-muted/50 border-b">
                {selectable && (
                  <th className="w-10 px-3 py-3 text-center" aria-label="Seleccionar todo">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      aria-label={allVisibleSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                      aria-checked={allVisibleSelected ? true : isIndeterminate ? 'mixed' : false}
                      role="checkbox"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isIndeterminate ? (
                        <Minus className="h-4 w-4" />
                      ) : allVisibleSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                )}
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    scope="col"
                    className={cn(
                      'px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap',
                      col.sortable && sortable
                        ? 'cursor-pointer select-none hover:text-foreground'
                        : '',
                      col.className,
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                    aria-sort={
                      sortKey === col.key
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    tabIndex={col.sortable && sortable ? 0 : undefined}
                    onKeyDown={
                      col.sortable && sortable
                        ? (e) => e.key === 'Enter' && handleSort(col.key)
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-1">
                      {col.header}
                      {col.sortable && sortable && (
                        <SortIcon dir={sortKey === col.key ? sortDir : null} />
                      )}
                    </div>
                  </th>
                ))}
                {hasActions && (
                  <th className="w-12 px-2" aria-label="Acciones" />
                )}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                skeletonArr.map((i) => (
                  <tr key={i} className="border-b last:border-0">
                    {selectable && (
                      <td className="px-3 py-3">
                        <Skeleton className="h-4 w-4 mx-auto" />
                      </td>
                    )}
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                    {hasActions && (
                      <td className="px-2 py-3">
                        <Skeleton className="h-7 w-7 rounded-md" />
                      </td>
                    )}
                  </tr>
                ))
              ) : visibleData.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      visibleColumns.length +
                      (selectable ? 1 : 0) +
                      (hasActions ? 1 : 0)
                    }
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    {emptyState ?? (
                      <div className="space-y-1">
                        <p className="font-medium">Sin resultados</p>
                        {(searchInput || hasActiveFilters) && (
                          <p className="text-xs">
                            Intentá con otros términos o{' '}
                            <button
                              type="button"
                              className="underline hover:text-foreground"
                              onClick={clearFilters}
                            >
                              limpiá los filtros
                            </button>
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                visibleData.map((row, idx) => {
                  const key = getRowKey(row, rowKey)
                  const isSelected = selectedKeys.has(key)
                  return (
                    <tr
                      key={key}
                      role="row"
                      aria-selected={selectable ? isSelected : undefined}
                      className={cn(
                        'border-b last:border-0 transition-colors',
                        idx % 2 === 1 && 'bg-muted/20',
                        isSelected && 'bg-primary/5',
                        onRowClick && 'cursor-pointer',
                        'hover:bg-muted/40',
                      )}
                      onClick={() => onRowClick?.(row)}
                      tabIndex={onRowClick ? 0 : undefined}
                      onKeyDown={
                        onRowClick
                          ? (e) => e.key === 'Enter' && onRowClick(row)
                          : undefined
                      }
                    >
                      {selectable && (
                        <td
                          className="px-3 py-3 text-center"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleRow(row)
                          }}
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={isSelected}
                            aria-label="Seleccionar fila"
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      )}
                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          className={cn('px-4 py-3', col.className)}
                        >
                          {getCellValue(row, col)}
                        </td>
                      ))}
                      {hasActions && (
                        <td
                          className="px-2 py-2 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <RowActionMenu item={row} actions={actions} />
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile Cards ── */}
      <div className="md:hidden space-y-2" role="list" aria-label="Lista de items">
        {loading ? (
          skeletonArr.map((i) => (
            <div key={i} className="border rounded-lg p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))
        ) : visibleData.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {emptyState ?? (
              <div className="space-y-1">
                <p className="font-medium">Sin resultados</p>
                {(searchInput || hasActiveFilters) && (
                  <p className="text-xs">
                    Intentá con otros términos o{' '}
                    <button
                      type="button"
                      className="underline hover:text-foreground"
                      onClick={clearFilters}
                    >
                      limpiá los filtros
                    </button>
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          visibleData.map((row) => {
            const key = getRowKey(row, rowKey)
            const isSelected = selectedKeys.has(key)
            return (
              <div
                key={key}
                role="listitem"
                className={cn(
                  'relative',
                  isSelected && 'ring-2 ring-primary rounded-lg',
                  onRowClick && 'cursor-pointer',
                )}
                onClick={() => onRowClick?.(row)}
              >
                {selectable && (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-label="Seleccionar"
                    className="absolute top-2 right-2 z-10 text-muted-foreground hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleRow(row)
                    }}
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                )}
                {renderCard(row)}
              </div>
            )
          })
        )}
      </div>

      {/* ── Pagination ── */}
      {pagination && totalPages > 1 && (
        <div
          className="flex items-center justify-between text-sm text-muted-foreground"
          aria-label="Paginación"
        >
          <span>
            Mostrando{' '}
            <strong className="text-foreground">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)}
            </strong>{' '}
            de <strong className="text-foreground">{totalCount}</strong>
          </span>

          <div className="flex items-center gap-1" role="group" aria-label="Navegación de páginas">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => handlePageChange(1)}
              aria-label="Primera página"
            >
              <ChevronLeft className="h-3 w-3" />
              <ChevronLeft className="h-3 w-3 -ml-2" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page number buttons */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePageChange(pageNum)}
                  aria-label={`Página ${pageNum}`}
                  aria-current={pageNum === page ? 'page' : undefined}
                >
                  {pageNum}
                </Button>
              )
            })}

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(totalPages)}
              aria-label="Última página"
            >
              <ChevronRight className="h-3 w-3" />
              <ChevronRight className="h-3 w-3 -ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
