import { useState, useEffect } from 'react';
import { Menu, Moon, Sun, LogOut, WifiOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { Sidebar, type NavTab } from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import type { TenantConfig } from '@platform/config';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MainLayoutProps {
  tenant: TenantConfig;
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  children: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MainLayout({ tenant, activeTab, onNavigate, children }: MainLayoutProps) {
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Track online/offline status
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (window.innerWidth >= 768) {
          setIsCollapsed((v) => !v);
        } else {
          setMobileSidebarOpen((v) => !v);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Apply tenant CSS custom properties for branding
  useEffect(() => {
    const root = document.documentElement;
    if (tenant.theme.primaryHsl) {
      root.style.setProperty('--primary', tenant.theme.primaryHsl);
      root.style.setProperty('--ring', tenant.theme.primaryHsl);
      root.style.setProperty('--sidebar-ring', tenant.theme.primaryHsl);
    }
    if (tenant.theme.accentHsl) {
      root.style.setProperty('--accent-hsl', tenant.theme.accentHsl);
    }
    if (tenant.theme.cssVars) {
      for (const [key, val] of Object.entries(tenant.theme.cssVars)) {
        root.style.setProperty(`--${key}`, val);
      }
    }
    document.title = tenant.name;
  }, [tenant]);

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '??';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        tenant={tenant}
        activeTab={activeTab}
        onNavigate={onNavigate}
        isOpen={mobileSidebarOpen}
        isCollapsed={isCollapsed}
        onClose={() => setMobileSidebarOpen(false)}
        onToggleCollapse={() => setIsCollapsed((v) => !v)}
      />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center h-14 px-4 border-b bg-background/95 backdrop-blur-sm flex-shrink-0 gap-3">
          {/* Mobile hamburger */}
          <button
            aria-label="Abrir menú"
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title / breadcrumb area */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground capitalize truncate">
              {activeTab === 'garments' ? 'Órdenes' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
          </div>

          {/* Offline indicator */}
          {isOffline && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-medium">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sin conexión</span>
            </div>
          )}

          {/* Theme toggle */}
          <button
            aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>

          {/* User avatar + logout */}
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
              style={{ backgroundColor: `hsl(${tenant.theme.primaryHsl})` }}
              title={user?.name}
            >
              {userInitials}
            </div>
            <span className="hidden sm:block text-sm text-foreground truncate max-w-[120px]">
              {user?.name}
            </span>
            <button
              aria-label="Cerrar sesión"
              onClick={logout}
              className={cn(
                'p-1.5 rounded-lg transition-colors text-muted-foreground hover:text-destructive hover:bg-destructive/10',
              )}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
