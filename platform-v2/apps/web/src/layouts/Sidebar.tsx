import { useEffect } from 'react';
import {
  LayoutDashboard,
  Shirt,
  Calendar,
  DollarSign,
  Users,
  FileText,
  MessageSquare,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { FeaturesConfig, TenantConfig } from '@platform/config';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NavTab =
  | 'dashboard'
  | 'garments'
  | 'appointments'
  | 'clients'
  | 'patients'
  | 'finances'
  | 'chat'
  | 'settings';

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Feature flag required for this item to appear, or undefined = always show */
  requiredFeature?: keyof FeaturesConfig;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',   icon: LayoutDashboard },
  { id: 'garments',     label: 'Órdenes',     icon: Shirt,           requiredFeature: 'garments' },
  { id: 'appointments', label: 'Turnos',      icon: Calendar,        requiredFeature: 'appointments' },
  { id: 'clients',      label: 'Clientes',    icon: Users },
  { id: 'patients',     label: 'Fichas',      icon: FileText,        requiredFeature: 'patientRecords' },
  { id: 'finances',     label: 'Finanzas',    icon: DollarSign,      requiredFeature: 'finances' },
  { id: 'chat',         label: 'AI Chat',     icon: MessageSquare,   requiredFeature: 'aiChat' },
  { id: 'settings',     label: 'Ajustes',     icon: Settings },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  tenant: TenantConfig;
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  /** Mobile: is the overlay open */
  isOpen: boolean;
  /** Desktop: is the sidebar collapsed to icons only */
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  /** Append className to root element */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar({
  tenant,
  activeTab,
  onNavigate,
  isOpen,
  isCollapsed,
  onClose,
  onToggleCollapse,
  className,
}: SidebarProps) {
  const features = tenant.features as FeaturesConfig;

  const visibleItems = ALL_NAV_ITEMS.filter(
    (item) => !item.requiredFeature || features[item.requiredFeature],
  );

  // Close on ESC (mobile)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleNav = (tab: NavTab) => {
    onNavigate(tab);
    onClose(); // auto-close on mobile after navigation
  };

  // ─── Sidebar inner content ─────────────────────────────────────────────────
  const inner = (
    <aside
      className={cn(
        'flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200',
        isCollapsed ? 'w-16' : 'w-64',
        className,
      )}
    >
      {/* Brand header */}
      <div
        className={cn(
          'flex items-center h-16 px-4 border-b border-sidebar-border gap-3 flex-shrink-0',
          isCollapsed && 'justify-center px-2',
        )}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: `hsl(${tenant.theme.primaryHsl})` }}
        >
          {tenant.brandLabel.slice(0, 2).toUpperCase()}
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none truncate">
              {tenant.brandLabel}
              <span className="text-sidebar-foreground/50 font-normal">
                {tenant.brandSuffix}
              </span>
            </p>
            <p className="text-xs text-sidebar-foreground/50 mt-0.5 truncate">{tenant.ownerName}</p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="space-y-0.5">
          {visibleItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <li key={id}>
                <button
                  onClick={() => handleNav(id)}
                  title={isCollapsed ? label : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive &&
                      'bg-sidebar-accent text-sidebar-accent-foreground',
                    isCollapsed && 'justify-center',
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4.5 h-4.5 flex-shrink-0',
                      isActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/70',
                    )}
                  />
                  {!isCollapsed && <span className="truncate">{label}</span>}
                  {isCollapsed && isActive && (
                    <span className="sr-only">{label} (activo)</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom: collapse toggle (desktop) */}
      <div className="px-2 py-2 border-t border-sidebar-border flex-shrink-0">
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          className="hidden md:flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 mx-auto" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Colapsar</span>
            </>
          )}
        </button>
        {/* Mobile close */}
        <button
          onClick={onClose}
          className="md:hidden flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-sidebar-foreground/50 hover:bg-sidebar-accent transition-colors"
        >
          <X className="w-4 h-4" />
          {!isCollapsed && <span>Cerrar</span>}
        </button>
      </div>
    </aside>
  );

  // ─── Mobile: overlay drawer ─────────────────────────────────────────────────
  return (
    <>
      {/* Desktop: static sidebar */}
      <div className="hidden md:flex h-full">{inner}</div>

      {/* Mobile: overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
            onClick={onClose}
          />
          {/* drawer */}
          <div className="relative z-50 animate-slide-in">
            {inner}
          </div>
        </div>
      )}
    </>
  );
}
