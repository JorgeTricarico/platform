import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Garments from './pages/Garments';
import Finances from './pages/Finances';
import Clients from './pages/Clients';
import ChatDemo from './pages/ChatDemo';
import NotificationBell from './components/NotificationBell';
import logoUrl from './assets/logo.png';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'garments' | 'finances' | 'clients' | 'chat'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="app-container">
      {/* Sidebar overlay for mobile */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img src={logoUrl} alt="Zenko Logo" style={{ width: 48, height: 48, borderRadius: '12px', objectFit: 'cover' }} />
          Zenko<span>.arg</span>
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
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <NotificationBell clientId="all" />
          <div className="user-profile">
            Ana & Ariel
            <div className="user-avatar">Z</div>
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

export default App;
