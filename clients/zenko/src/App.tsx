import { useState, useEffect, lazy, Suspense } from 'react';
import { useTheme } from './hooks/useTheme';
import {
  LayoutDashboard,
  Shirt,
  DollarSign,
  Users,
  MessageSquare,
  QrCode,
  Menu,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  X,
  BellRing,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Garments = lazy(() => import('./pages/Garments'));
const Finances = lazy(() => import('./pages/Finances'));
const Clients = lazy(() => import('./pages/Clients'));
const ChatDemo = lazy(() => import('./pages/ChatDemo'));
const QRScanner = lazy(() => import('./pages/QRScanner'));
const Login = lazy(() => import('./pages/Login'));
const PublicStatus = lazy(() => import('./pages/PublicStatus'));
const ClientNotifications = lazy(() => import('./pages/ClientNotifications'));
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

type Tab = 'dashboard' | 'garments' | 'finances' | 'clients' | 'chat' | 'qr' | 'notifications';
const VALID_TABS: Tab[] = ['dashboard', 'garments', 'finances', 'clients', 'chat', 'qr', 'notifications'];

function readTabFromHash(): Tab {
  const hash = window.location.hash.replace('#', '');
  return VALID_TABS.includes(hash as Tab) ? (hash as Tab) : 'garments';
}

const NAV_ITEMS: { id: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard',     label: 'Dashboard',         Icon: LayoutDashboard },
  { id: 'garments',      label: 'Ordenes',           Icon: Shirt },
  { id: 'finances',      label: 'Finanzas',          Icon: DollarSign },
  { id: 'clients',       label: 'Clientes',          Icon: Users },
  { id: 'notifications', label: 'Avisos a Clientes', Icon: BellRing },
  { id: 'chat',          label: 'AI Bot',            Icon: MessageSquare },
  { id: 'qr',            label: 'Escáner QR',        Icon: QrCode },
];

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>(readTabFromHash);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [createTrigger, setCreateTrigger] = useState(0);
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

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (window.innerWidth > 768) {
          setIsCollapsed((prev) => !prev);
        } else {
          setSidebarOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigate = (tab: Tab) => {
    window.location.hash = tab;
    setActiveTab(tab);
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const handleGlobalSearch = (val: string) => {
    setGlobalSearch(val);
    if (val) navigate('garments');
  };

  const handleFABCreate = () => {
    navigate('garments');
    setCreateTrigger(t => t + 1);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <OfflineIndicator />

      {/* Mobile sidebar overlay — always in DOM, visibility controlled by CSS + state */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 z-20 md:hidden transition-opacity duration-300',
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-30 flex flex-col',
          'bg-card border-r border-border shadow-sm',
          'transition-all duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'w-[300px]', // Ancho mobile aumentado
          isCollapsed ? 'md:w-16' : 'md:w-64', // Colapsado solo aplica en desktop
          'md:relative md:translate-x-0 md:flex'
        )}
      >
        {/* Floating Collapse Button (Desktop) */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex absolute -right-3 top-8 h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-all z-40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
          title={isCollapsed ? 'Expandir (Ctrl+B)' : 'Colapsar (Ctrl+B)'}
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        {/* Logo & Header */}
        <div className={cn(
          'flex items-center pt-5 pb-4 border-b border-border',
          isCollapsed ? 'justify-center px-2' : 'px-5'
        )}>
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt={`${BUSINESS.name} Logo`}
              className="w-12 h-12 md:w-10 md:h-10 rounded-xl object-cover flex-shrink-0"
            />
            {!isCollapsed && (
              <span className="text-xl font-extrabold text-foreground tracking-tight">
                {BUSINESS.brandLabel}<span className="text-primary">{BUSINESS.brandSuffix}</span>
              </span>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={cn(
                'w-full flex items-center gap-5 px-5 py-4 md:gap-4 md:px-4 md:py-3.5 rounded-xl text-lg md:text-[15px] font-semibold transition-colors',
                isCollapsed && 'md:justify-center md:px-0 md:py-3.5 md:gap-0',
                activeTab === id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={isCollapsed ? label : undefined}
            >
              <Icon className="w-6 h-6 md:w-5 md:h-5 flex-shrink-0" />
              <span className={cn(isCollapsed && 'md:hidden')}>
                {label}
              </span>
            </button>
          ))}
        </nav>


      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-4 h-14 border-b border-border bg-card flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>

          {/* Global search */}
          <div className="flex-1 max-w-xs relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar orden, cliente..."
              value={globalSearch}
              onChange={e => handleGlobalSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            {globalSearch && (
              <button
                onClick={() => setGlobalSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Cluster de usuario alineado a la derecha (ml-auto empuja al margen).
              Antes quedaba flotando al lado del search en el centro de la topbar. */}
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell clientId="all" />

            {/* Theme switch */}
            <button
              onClick={toggleTheme}
              title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
              aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
              className={cn(
                'relative flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 flex-shrink-0',
                theme === 'dark'
                  ? 'bg-primary border-primary'
                  : 'bg-muted border-border'
              )}
            >
              <span className={cn(
                'absolute flex h-4 w-4 items-center justify-center rounded-full bg-white shadow transition-transform duration-200',
                theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'
              )}>
                {theme === 'dark'
                  ? <Moon className="w-2.5 h-2.5 text-primary" />
                  : <Sun className="w-2.5 h-2.5 text-amber-500" />
                }
              </span>
            </button>

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
          </div>
        </header>

        {/* Page content.
            - pb-28 si la tab tiene FAB flotante (para que no tape la ultima fila).
            - p-0 + overflow-hidden en QR para layout full-viewport sin scroll. */}
        <div className={cn(
          'flex-1 bg-background',
          activeTab === 'qr'
            ? 'overflow-hidden p-3 md:p-4'
            : 'overflow-y-auto p-4 md:p-6',
          activeTab !== 'qr' && activeTab !== 'notifications' && activeTab !== 'chat' && 'pb-28'
        )}>
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center min-h-60 text-muted-foreground">Cargando...</div>}>
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'garments' && <Garments externalSearch={globalSearch} createTrigger={createTrigger} />}
              {activeTab === 'finances' && <Finances />}
              {activeTab === 'clients' && <Clients />}
              {activeTab === 'notifications' && <ClientNotifications />}
              {activeTab === 'chat' && <ChatDemo />}
              {activeTab === 'qr' && <QRScanner />}
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      {/* FAB — Nueva orden. Solo visible en tabs donde tiene sentido crear orden. */}
      {activeTab !== 'notifications' && activeTab !== 'chat' && activeTab !== 'qr' && (
        <button
          onClick={handleFABCreate}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
          title="Nueva orden"
          aria-label="Nueva orden"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
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
