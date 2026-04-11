import { useState, useEffect, lazy, Suspense } from 'react';
import { useTheme } from './hooks/useTheme';
import {
  LayoutDashboard,
  Shirt,
  DollarSign,
  Users,
  MessageSquare,
  ChevronLeft,
  Menu,
  Moon,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Garments = lazy(() => import('./pages/Garments'));
const Finances = lazy(() => import('./pages/Finances'));
const Clients = lazy(() => import('./pages/Clients'));
const ChatDemo = lazy(() => import('./pages/ChatDemo'));
const Login = lazy(() => import('./pages/Login'));
const PublicStatus = lazy(() => import('./pages/PublicStatus'));
import NotificationBell from './components/NotificationBell';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/ToastContext';
import { AuthProvider, useAuth } from './components/AuthContext';
import { setupOnlineSync } from './services/sync';
import { BUSINESS } from './config/business';
import logoUrl from './assets/logo.png';

function AuthGate() {
  const { isAuthenticated, loading } = useAuth();
  const isPublicView = window.location.search.includes('view=status');

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-background" />;
  }

  if (isPublicView) return <ErrorBoundary><Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-background" />}><PublicStatus /></Suspense></ErrorBoundary>;
  if (!isAuthenticated) return <ErrorBoundary><Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-background" />}><Login /></Suspense></ErrorBoundary>;
  return <AppContent />;
}

type Tab = 'dashboard' | 'garments' | 'finances' | 'clients' | 'chat';
const VALID_TABS: Tab[] = ['dashboard', 'garments', 'finances', 'clients', 'chat'];

function readTabFromHash(): Tab {
  const hash = window.location.hash.replace('#', '');
  return VALID_TABS.includes(hash as Tab) ? (hash as Tab) : 'dashboard';
}

const NAV_ITEMS: { id: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'garments', label: 'Ordenes', Icon: Shirt },
  { id: 'finances', label: 'Finanzas', Icon: DollarSign },
  { id: 'clients', label: 'Clientes', Icon: Users },
  { id: 'chat', label: 'AI Bot', Icon: MessageSquare },
];

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>(readTabFromHash);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const toast = useToast();
  const { user, authRequired, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  // Sync hash → state (back/forward buttons)
  useEffect(() => {
    const onHashChange = () => setActiveTab(readTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    const cleanup = setupOnlineSync((count) => {
      toast.success(`${count} cambio${count > 1 ? 's' : ''} sincronizado${count > 1 ? 's' : ''}`);
    });
    return cleanup;
  }, []);

  const navigate = (tab: Tab) => {
    window.location.hash = tab;
    setActiveTab(tab);
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isMobileOverlayVisible = sidebarOpen && typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <OfflineIndicator />

      {/* Mobile sidebar overlay */}
      {isMobileOverlayVisible && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-30 flex flex-col',
          'bg-card border-r border-border shadow-sm',
          'transition-all duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'w-16' : 'w-56',
          'md:relative md:translate-x-0 md:flex'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center gap-3 px-4 py-5 border-b border-border',
          isCollapsed && 'justify-center px-2'
        )}>
          <img
            src={logoUrl}
            alt={`${BUSINESS.name} Logo`}
            className="w-11 h-11 rounded-xl object-cover flex-shrink-0"
          />
          {!isCollapsed && (
            <span className="text-lg font-bold text-foreground">
              {BUSINESS.brandLabel}<span className="text-primary">{BUSINESS.brandSuffix}</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isCollapsed && 'justify-center px-2',
                activeTab === id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={isCollapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {/* Collapse button */}
        <div className="px-2 py-3 border-t border-border">
          <button
            onClick={toggleCollapse}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
              isCollapsed && 'justify-center px-2'
            )}
            title={isCollapsed ? 'Expandir' : undefined}
          >
            <ChevronLeft
              className={cn(
                'w-5 h-5 flex-shrink-0 transition-transform duration-200',
                isCollapsed && 'rotate-180'
              )}
            />
            {!isCollapsed && <span>Colapsar</span>}
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-4 h-14 border-b border-border bg-card flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex-1" />

          <NotificationBell clientId="all" />

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground hidden sm:block">
              {user?.name || BUSINESS.ownerName}
            </span>
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
              {BUSINESS.brandLabel[0]}
            </div>
            {authRequired && user && (
              <Button variant="outline" size="sm" onClick={logout}>
                Salir
              </Button>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto bg-background">
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center min-h-60 text-muted-foreground">Cargando...</div>}>
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'garments' && <Garments />}
              {activeTab === 'finances' && <Finances />}
              {activeTab === 'clients' && <Clients />}
              {activeTab === 'chat' && <ChatDemo />}
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthGate />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
