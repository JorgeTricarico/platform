import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Finances from './pages/Finances';
import Clients from './pages/Clients';
import Patients from './pages/Patients';
import Agent from './pages/Agent';
import ChatDemo from './pages/ChatDemo';
import Ambient from './pages/Ambient';
import Login from './pages/Login';
import { MusicProvider, useMusicCommand } from './components/MusicContext';
import { ToastProvider, useToast } from './components/ToastContext';
import { AuthProvider, useAuth } from './components/AuthContext';
import { OfflineIndicator } from './components/OfflineIndicator';
import { setupOnlineSync } from './services/sync';
import { BUSINESS } from './config';
import logoUrl from './assets/logo.svg';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'appointments' | 'finances' | 'patients' | 'clients' | 'agent' | 'chat' | 'ambient'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isPlaying, currentTrackTitle } = useMusicCommand();
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
      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <img src={logoUrl} alt={`${BUSINESS.name} Logo`} style={{ width: 48, height: 48, borderRadius: '12px', objectFit: 'cover' }} />
          <span className="logo-text">{BUSINESS.brandLabel}<span>{BUSINESS.brandSuffix}</span></span>
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
            className={`nav-link ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => navigate('appointments')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            Citas y Turnos
          </div>
          <div
            className={`nav-link ${activeTab === 'finances' ? 'active' : ''}`}
            onClick={() => navigate('finances')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Finanzas
          </div>
          <div
            className={`nav-link ${activeTab === 'ambient' ? 'active' : ''}`}
            onClick={() => navigate('ambient')}
            title={isPlaying && currentTrackTitle ? `Reproduciendo: ${currentTrackTitle}` : undefined}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            Musica Ambiente
            {isPlaying && (
              <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--success-color, #22c55e)', animation: 'pulse 2s infinite', flexShrink: 0 }} />
            )}
          </div>
          <div
            className={`nav-link ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => navigate('clients')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            Clientes
          </div>
          <div
            className={`nav-link ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => navigate('patients')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Fichas Clinicas
          </div>
          <div
            className={`nav-link ${activeTab === 'agent' ? 'active' : ''}`}
            onClick={() => navigate('agent')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Asistente IA
          </div>
          <div
            className={`nav-link ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => navigate('chat')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            Chat Bot Demo
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="hamburger-btn" onClick={toggleSidebar}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
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
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'appointments' && <Appointments />}
          {activeTab === 'finances' && <Finances />}
          {activeTab === 'clients' && <Clients />}
          {activeTab === 'patients' && <Patients />}
          {activeTab === 'agent' && <Agent />}
          <div style={{ display: activeTab === 'ambient' ? 'block' : 'none' }}><Ambient /></div>
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
        <MusicProvider>
          <AuthGate />
        </MusicProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
