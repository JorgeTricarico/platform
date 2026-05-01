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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Garments = lazy(() => import('./pages/Garments'));
const Finances = lazy(() => import('./pages/Finances'));
const Clients = lazy(() => import('./pages/Clients'));
const ChatDemo = lazy(() => import('./pages/ChatDemo'));
const QRScanner = lazy(() => import('./pages/QRScanner'));
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

type Tab = 'dashboard' | 'garments' | 'finances' | 'clients' | 'chat' | 'qr';
const VALID_TABS: Tab[] = ['dashboard', 'garments', 'finances', 'clients', 'chat', 'qr'];

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
  { id: 'qr', label: 'Escáner QR', Icon: QrCode },
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
        <div className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center min-h-60 text-muted-foreground">Cargando...</div>}>
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'garments' && <Garments />}
              {activeTab === 'finances' && <Finances />}
              {activeTab === 'clients' && <Clients />}
              {activeTab === 'chat' && <ChatDemo />}
              {activeTab === 'qr' && <QRScanner />}
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
