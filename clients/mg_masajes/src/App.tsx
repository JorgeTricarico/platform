import { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  DollarSign, 
  Music, 
  Users, 
  FileText, 
  Zap, 
  MessageSquare,
  Menu,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from './lib/utils';
import { Button } from './components/ui/button';
import { useTheme } from './hooks/useTheme';
import { MusicProvider, useMusicCommand } from './components/MusicContext';
import { ToastProvider, useToast } from './components/ToastContext';
import { AuthProvider, useAuth } from './components/AuthContext';
import { DashboardRefreshProvider } from './components/DashboardRefreshContext';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { setupOnlineSync } from './services/sync';
import { BUSINESS } from './config';
import logoUrl from './assets/logo_mg.png';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Finances = lazy(() => import('./pages/Finances'));
const Clients = lazy(() => import('./pages/Clients'));
const Patients = lazy(() => import('./pages/Patients'));
const Agent = lazy(() => import('./pages/Agent'));
const ChatDemo = lazy(() => import('./pages/ChatDemo'));
const Ambient = lazy(() => import('./pages/Ambient'));
const Login = lazy(() => import('./pages/Login'));

function AuthGate() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-background" />;
  }

  if (!isAuthenticated) return <ErrorBoundary><Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-background" />}><Login /></Suspense></ErrorBoundary>;
  return <AppContent />;
}

type Tab = 'dashboard' | 'appointments' | 'finances' | 'patients' | 'clients' | 'agent' | 'chat' | 'ambient';

const NAV_ITEMS: { id: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'appointments', label: 'Citas y Turnos', Icon: Calendar },
  { id: 'finances', label: 'Finanzas', Icon: DollarSign },
  { id: 'ambient', label: 'Música', Icon: Music },
  { id: 'clients', label: 'Clientes', Icon: Users },
  { id: 'patients', label: 'Fichas', Icon: FileText },
  { id: 'agent', label: 'AI', Icon: Zap },
  { id: 'chat', label: 'Chat Beta', Icon: MessageSquare },
];

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isPlaying, currentTrackTitle, sendMusicCommand } = useMusicCommand();
  const toast = useToast();
  const { user, authRequired, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const location = useLocation();
  const routerNavigate = useNavigate();

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/clients')) setActiveTab('clients');
    else if (path.includes('/patients')) setActiveTab('patients');
    else if (path.includes('/appointments')) setActiveTab('appointments');
    else if (path.includes('/finances')) setActiveTab('finances');
    else if (path.includes('/agent')) setActiveTab('agent');
    else if (path.includes('/chat')) setActiveTab('chat');
    else if (path.includes('/ambient')) setActiveTab('ambient');
    else setActiveTab('dashboard');
  }, [location.pathname]);

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

  const handleNavigate = (tab: Tab) => {
    const path = tab === 'dashboard' ? '/' : `/${tab}`;
    routerNavigate(path);
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
    <div className="flex h-screen bg-background overflow-hidden relative">
      <OfflineIndicator />
      
      {/* Mobile sidebar overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/40 z-20 md:hidden transition-opacity duration-300",
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )} 
        onClick={() => setSidebarOpen(false)} 
      />

      <aside 
        className={cn(
          "fixed top-0 left-0 h-full z-30 flex flex-col bg-card border-r border-border shadow-sm transition-all duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "w-[300px]", // Ancho mobile aumentado para legibilidad
          isCollapsed ? "md:w-16" : "md:w-64", // Colapsado solo en desktop
          "md:relative md:translate-x-0 md:flex"
        )}
      >
        {/* Floating Collapse Button (Desktop) */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex absolute -right-3 top-8 h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted text-muted-foreground transition-all z-40 focus:outline-none"
          title={isCollapsed ? 'Expandir' : 'Colapsar'}
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        <div className={cn(
          "flex items-center pt-5 pb-4 border-b border-border",
          isCollapsed ? "justify-center px-2" : "px-5"
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

        <nav className="flex-1 px-3 py-5 space-y-2 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => handleNavigate(id)}
              className={cn(
                "w-full flex items-center gap-5 px-5 py-4 md:gap-4 md:px-4 md:py-3.5 rounded-xl text-lg md:text-[15px] font-semibold transition-colors relative",
                isCollapsed && "md:justify-center md:px-0 md:py-3.5 md:gap-0",
                activeTab === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={isCollapsed ? label : undefined}
            >
              <Icon className="w-6 h-6 md:w-5 md:h-5 flex-shrink-0" />
              <span className={cn(isCollapsed && "md:hidden")}>
                {label}
              </span>
              {id === 'ambient' && isPlaying && (
                 <span className={cn(
                   "w-2 h-2 rounded-full bg-success animate-pulse",
                   isCollapsed ? "absolute top-2 right-2" : "ml-auto"
                 )} />
              )}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <header className="flex items-center gap-3 px-4 h-14 border-b border-border bg-card flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
            <Menu className="w-5 h-5 text-foreground" />
          </Button>

          {currentTrackTitle && (
            <div className="hidden sm:flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-full border border-border/20 max-w-[250px]">
              <button onClick={() => sendMusicCommand({ action: isPlaying ? 'pause' : 'play' })} className="text-primary hover:scale-110 transition-transform">
                {isPlaying ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>}
              </button>
              <span className="text-[11px] font-bold text-muted-foreground truncate">{currentTrackTitle}</span>
            </div>
          )}

          <div className="flex-1" />

          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground">
            {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
          </Button>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-sm font-semibold text-foreground">
              {user?.name || BUSINESS.ownerName}
            </span>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
              {BUSINESS.ownerName[0]}
            </div>
            {authRequired && (
              <Button variant="outline" size="sm" onClick={logout} className="ml-1 text-[11px] h-7 px-2">Salir</Button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-background p-4 md:p-6 lg:p-8">
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'appointments' && <Appointments />}
              {activeTab === 'finances' && <Finances />}
              {activeTab === 'clients' && <Clients />}
              {activeTab === 'patients' && <Patients />}
              {activeTab === 'agent' && <Agent />}
              <div className={cn("h-full", activeTab !== 'ambient' && "hidden")}>
                <Ambient />
              </div>
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
        <MusicProvider>
          <DashboardRefreshProvider>
            <AuthGate />
          </DashboardRefreshProvider>
        </MusicProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

