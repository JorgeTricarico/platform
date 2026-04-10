import { useState, useEffect, lazy, Suspense } from 'react';
import { useTheme } from './hooks/useTheme';
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
import logoUrl from './assets/logo.png';

function AuthGate() {
  const { isAuthenticated, loading } = useAuth();
  const isPublicView = window.location.search.includes('view=status');

  if (loading) {
    return <div className="page-loading" />;
  }

  if (isPublicView) return <ErrorBoundary><Suspense fallback={<div className="page-loading" />}><PublicStatus /></Suspense></ErrorBoundary>;
  if (!isAuthenticated) return <ErrorBoundary><Suspense fallback={<div className="page-loading" />}><Login /></Suspense></ErrorBoundary>;
  return <AppContent />;
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'garments' | 'finances' | 'clients' | 'chat'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default visible on desktop
  const [isCollapsed, setIsCollapsed] = useState(false);
  const toast = useToast();
  const { user, authRequired, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

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

  const navigate = (tab: typeof activeTab) => {
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
    <div className="app-container">
      <OfflineIndicator />
      {/* Sidebar overlay for mobile */}
      <div className={`sidebar-overlay ${sidebarOpen && window.innerWidth <= 768 ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'hidden'} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <img src={logoUrl} alt="Zenko Logo" style={{ width: 44, height: 44, borderRadius: '12px', objectFit: 'cover' }} />
          <span className="logo-text">Zenko<span>.arg</span></span>
        </div>
        
        <nav className="nav-menu">
          <div 
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => navigate('dashboard')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>Dashboard</span>
          </div>
          <div 
            className={`nav-link ${activeTab === 'garments' ? 'active' : ''}`}
            onClick={() => navigate('garments')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"></path></svg>
            <span>Ordenes</span>
          </div>
          <div 
            className={`nav-link ${activeTab === 'finances' ? 'active' : ''}`}
            onClick={() => navigate('finances')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            <span>Finanzas</span>
          </div>
          <div
            className={`nav-link ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => navigate('clients')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>Clientes</span>
          </div>
          <div
            className={`nav-link ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => navigate('chat')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span>AI Bot</span>
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

      {/* Main Area */}
      <main className="main-content">
        <header className="topbar">
          <button className="hamburger-btn" onClick={toggleSidebar}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <NotificationBell clientId="all" />
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
            {user?.name || 'Ana & Ariel'}
            <div className="user-avatar" style={{ backgroundColor: 'var(--primary-color)' }}>Z</div>
            {authRequired && user && (
              <button className="btn" onClick={logout} style={{ marginLeft: 8, padding: '4px 8px', fontSize: '0.75rem' }}>Salir</button>
            )}
          </div>
        </header>

        <div className="page-content">
          <ErrorBoundary>
            <Suspense fallback={<div className="page-loading" />}>
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
