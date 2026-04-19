import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';
import type { DashboardStats } from '../services/api';
import type { TenantConfig } from '@platform/types';
import type { NavTab } from '../layouts/Sidebar';

// ─── Props ────────────────────────────────────────────────────────────────────

interface DashboardProps {
  tenant: TenantConfig;
  onNavigate: (tab: NavTab) => void;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div className="stat-card animate-pulse">
      <div className="h-3.5 w-24 bg-muted rounded mb-3" />
      <div className="h-7 w-16 bg-muted rounded mb-1" />
      <div className="h-3 w-20 bg-muted rounded" />
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
}

function StatCard({ label, value, subtext, icon, trend, onClick }: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'stat-card text-left w-full transition-shadow',
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/30',
        !onClick && 'cursor-default',
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {subtext && (
        <p
          className={cn(
            'text-xs mt-1 flex items-center gap-1',
            trend === 'up' && 'text-emerald-600 dark:text-emerald-400',
            trend === 'down' && 'text-red-600 dark:text-red-400',
            (!trend || trend === 'neutral') && 'text-muted-foreground',
          )}
        >
          {trend === 'up' && <TrendingUp className="w-3 h-3" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3" />}
          {subtext}
        </p>
      )}
    </button>
  );
}

// ─── Activity Item ────────────────────────────────────────────────────────────

function ActivityItem({
  type,
  label,
  sublabel,
  timestamp,
  status,
}: DashboardStats['recentActivity'][number]) {
  const typeColors: Record<string, string> = {
    order: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    appointment: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    finance: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  };
  const typeLabels: Record<string, string> = {
    order: 'Orden',
    appointment: 'Turno',
    finance: 'Finanza',
  };

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <span
        className={cn(
          'text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0',
          typeColors[type] ?? 'bg-muted text-muted-foreground',
        )}
      >
        {typeLabels[type] ?? type}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{sublabel}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-muted-foreground">{formatDate(timestamp.split('T')[0] ?? '')}</p>
        {status && (
          <p className="text-[10px] text-muted-foreground capitalize">{status}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard({ tenant, onNavigate }: DashboardProps) {
  const api = useApi();
  const toast = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await api.dashboard.get();
      setStats(data);
    } catch {
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const currency = tenant.currency;
  const features = tenant.features;

  const profit = stats
    ? stats.monthlyIncome - stats.monthlyExpenses
    : 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="text-lg font-semibold">{tenant.greeting}</h2>
          <p className="text-sm text-muted-foreground">{tenant.subtitle}</p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Hoy"
              value={stats?.todayCount ?? 0}
              subtext={features.appointments ? 'turnos' : 'órdenes'}
              icon={<Clock className="w-4 h-4" />}
              onClick={features.appointments ? () => onNavigate('appointments') : features.orders ? () => onNavigate('garments') : undefined}
            />
            <StatCard
              label="Pendientes"
              value={stats?.pendingCount ?? 0}
              subtext="por atender"
              icon={<AlertTriangle className="w-4 h-4" />}
              trend={stats && stats.pendingCount > 5 ? 'down' : 'neutral'}
            />
            <StatCard
              label="Ingresos"
              value={formatCurrency(stats?.monthlyIncome ?? 0, currency)}
              subtext="este mes"
              icon={<TrendingUp className="w-4 h-4" />}
              trend="up"
              onClick={features.finance ? () => onNavigate('finances') : undefined}
            />
            <StatCard
              label="Balance"
              value={formatCurrency(profit, currency)}
              subtext={profit >= 0 ? 'ganancia neta' : 'pérdida neta'}
              icon={<CheckCircle2 className="w-4 h-4" />}
              trend={profit >= 0 ? 'up' : 'down'}
            />
          </>
        )}
      </div>

      {/* Status breakdown + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status breakdown */}
        {(features.orders || features.appointments) && (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-4">Por estado</h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : stats?.byStatus && Object.keys(stats.byStatus).length > 0 ? (
              <div className="space-y-2">
                {tenant.statuses.map(({ key, label }) => {
                  const count = stats.byStatus[key] ?? 0;
                  const total = Object.values(stats.byStatus).reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-24 truncate">{label}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/70 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
            )}
          </div>
        )}

        {/* Recent activity */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">Actividad reciente</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : stats?.recentActivity?.length ? (
            <div>
              {stats.recentActivity.slice(0, 8).map((item) => (
                <ActivityItem key={item.id} {...item} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin actividad reciente</p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-4 rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold mb-3">Acciones rápidas</h3>
        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
          {features.orders && (
            <button
              onClick={() => onNavigate('garments')}
              className="flex items-center justify-center md:justify-start gap-1.5 text-sm px-3 py-2 rounded-lg border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva orden
            </button>
          )}
          {features.appointments && (
            <button
              onClick={() => onNavigate('appointments')}
              className="flex items-center justify-center md:justify-start gap-1.5 text-sm px-3 py-2 rounded-lg border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo turno
            </button>
          )}
          {features.finance && (
            <button
              onClick={() => onNavigate('finances')}
              className="flex items-center justify-center md:justify-start gap-1.5 text-sm px-3 py-2 rounded-lg border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar ingreso
            </button>
          )}
          <button
            onClick={() => onNavigate('clients')}
            className="flex items-center justify-center md:justify-start gap-1.5 text-sm px-3 py-2 rounded-lg border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo cliente
          </button>
        </div>
      </div>
    </div>
  );
}
