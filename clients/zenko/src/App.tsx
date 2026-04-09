import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Garments from './pages/Garments';
import Finances from './pages/Finances';
import Clients from './pages/Clients';
import ChatDemo from './pages/ChatDemo';
import Login from './pages/Login';
import NotificationBell from './components/NotificationBell';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ToastProvider, useToast } from './components/ToastContext';
import { AuthProvider, useAuth } from './components/AuthContext';
import { setupOnlineSync } from './services/sync';
import logoUrl from './assets/logo.png';

function AuthGate() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p>Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) return <Login />;
  return <AppContent />;
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'garments' | 'finances' | 'clients' | 'chat'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const toast = useToast();
  const { user, authRequired, logout } = useAuth();

  useEffect(() => {
    const cleanup = setupOnlineSync((count) => {
      toast.success(`${count} cambio${count > 1 ? 's' : ''} sincronizado${count > 1 ? 's' : ''}`);
    });
    return cleanup;
  }, []);

  const navigate = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const toggleSidebar = () => {
    if (window.innerWidth > 768) {
      setIsCollapsed(!isCollapsed);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

  return (
    <div className="app-container">
      <OfflineIndicator />
      {/* Sidebar overlay for mobile */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <img src={logoUrl} alt="Zenko Logo" style={{ width: 48, height: 48, borderRadius: '12px', objectFit: 'cover' }} />
          <span className="logo-text">Zenko<span>.arg</span></span>
        </div>
        
        <nav className="nav-menu">
          <div 
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => navigate('dashboard')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Dashboard
          </div>
          <div 
            className={`nav-link ${activeTab === 'garments' ? 'active' : ''}`}
            onClick={() => navigate('garments')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"></path></svg>
            Prendas y Órdenes
          </div>
          <div 
            className={`nav-link ${activeTab === 'finances' ? 'active' : ''}`}
            onClick={() => navigate('finances')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Finanzas
          </div>
          <div
            className={`nav-link ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => navigate('chat')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            Chat Bot Demo
          </div>
          <div
            className={`nav-link ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => navigate('clients')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            Clientes
          </div>
        </nav>
      </aside>

      {/* Main Area */}
      <main className="main-content">
        <header className="topbar">
          <button className="hamburger-btn" onClick={toggleSidebar}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <NotificationBell clientId="all" />
          <div className="user-profile">
            {user?.name || 'Ana & Ariel'}
            <div className="user-avatar">Z</div>
            {authRequired && (
              <button className="btn" onClick={logout} style={{ marginLeft: 8, padding: '4px 8px', fontSize: '0.75rem' }}>Salir</button>
            )}
          </div>
        </header>

        <div className="page-content">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'garments' && <Garments />}
          {activeTab === 'finances' && <Finances />}
          {activeTab === 'clients' && <Clients />}
          {activeTab === 'chat' && <ChatDemo />}
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
