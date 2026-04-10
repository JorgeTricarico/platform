import { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import { MusicProvider, useMusicCommand } from './components/MusicContext';
import { ToastProvider, useToast } from './components/ToastContext';
import { AuthProvider, useAuth } from './components/AuthContext';
import { DashboardRefreshProvider } from './components/DashboardRefreshContext';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { setupOnlineSync } from './services/sync';
import { BUSINESS } from './config';
import logoUrl from './assets/logo.svg';

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
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p>Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) return <ErrorBoundary><Suspense fallback={<div className="page-loading" />}><Login /></Suspense></ErrorBoundary>;
  return <AppContent />;
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'appointments' | 'finances' | 'patients' | 'clients' | 'agent' | 'chat' | 'ambient'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default visible on desktop
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isPlaying, currentTrackTitle } = useMusicCommand();
  const toast = useToast();
  const { user, authRequired, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const location = useLocation();
  const routerNavigate = useNavigate();

  // Sync state with URL path
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
    // Initial state based on screen size
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

  const handleNavigate = (tab: typeof activeTab) => {
    // Navigate using React Router to update URL
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
    <div className="app-container">
      <OfflineIndicator />
      <div className={`sidebar-overlay ${sidebarOpen && window.innerWidth <= 768 ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'hidden'} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <img src={logoUrl} alt={`${BUSINESS.name} Logo`} style={{ width: 44, height: 44, borderRadius: '12px', objectFit: 'cover' }} />
          <span className="logo-text">{BUSINESS.brandLabel}<span>{BUSINESS.brandSuffix}</span></span>
        </div>

        <nav className="nav-menu">
          <div
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavigate('dashboard')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>Dashboard</span>
          </div>
          <div
            className={`nav-link ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => handleNavigate('appointments')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>Citas y Turnos</span>
          </div>
          <div
            className={`nav-link ${activeTab === 'finances' ? 'active' : ''}`}
            onClick={() => handleNavigate('finances')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            <span>Finanzas</span>
          </div>
          <div
            className={`nav-link ${activeTab === 'ambient' ? 'active' : ''}`}
            onClick={() => handleNavigate('ambient')}
            title={isPlaying && currentTrackTitle ? `Reproduciendo: ${currentTrackTitle}` : undefined}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            <span>Musica</span>
            {isPlaying && (
              <span className="music-pulse" style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--success-color, #22c55e)', animation: 'pulse 2s infinite', flexShrink: 0 }} />
            )}
          </div>
          <div
            className={`nav-link ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => handleNavigate('clients')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>Clientes</span>
          </div>
          <div
            className={`nav-link ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => handleNavigate('patients')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <span>Fichas</span>
          </div>
          <div
            className={`nav-link ${activeTab === 'agent' ? 'active' : ''}`}
            onClick={() => handleNavigate('agent')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <span>AI</span>
          </div>
          <div
            className={`nav-link ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => handleNavigate('chat')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span>Chat</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="collapse-btn" onClick={toggleCollapse}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Colapsar</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="hamburger-btn" onClick={toggleSidebar}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <button className="theme-toggle" onClick={toggleTheme} title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}>
            {theme === 'light' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
          </button>
          <div className="user-profile">
            {user?.name || BUSINESS.ownerName}
            <div className="user-avatar">D</div>
            {authRequired && (
              <button className="btn" onClick={logout} style={{ marginLeft: 8, padding: '4px 8px', fontSize: '0.75rem' }}>Salir</button>
            )}
          </div>
        </header>

        <div className="page-content">
          <ErrorBoundary>
            <Suspense fallback={<div className="page-loading" />}>
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'appointments' && <Appointments />}
              {activeTab === 'finances' && <Finances />}
              {activeTab === 'clients' && <Clients />}
              {activeTab === 'patients' && <Patients />}
              {activeTab === 'agent' && <Agent />}
              <div style={{ display: activeTab === 'ambient' ? 'block' : 'none' }}><Ambient /></div>
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
