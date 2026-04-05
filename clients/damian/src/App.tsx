import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Finances from './pages/Finances';
import ChatDemo from './pages/ChatDemo';
import Ambient from './pages/Ambient';
import { BUSINESS } from './config';
import logoUrl from './assets/logo.png';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'appointments' | 'finances' | 'chat' | 'ambient'>('dashboard');

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logoUrl} alt={`${BUSINESS.name} Logo`} style={{ width: 48, height: 48, borderRadius: '12px', objectFit: 'cover' }} />
          {BUSINESS.brandLabel}<span>{BUSINESS.brandSuffix}</span>
        </div>

        <nav className="nav-menu">
          <div
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Dashboard
          </div>
          <div
            className={`nav-link ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            Citas y Turnos
          </div>
          <div
            className={`nav-link ${activeTab === 'finances' ? 'active' : ''}`}
            onClick={() => setActiveTab('finances')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Finanzas
          </div>
          <div
            className={`nav-link ${activeTab === 'ambient' ? 'active' : ''}`}
            onClick={() => setActiveTab('ambient')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            Musica Ambiente
          </div>
          <div
            className={`nav-link ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            Chat Bot Demo
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="user-profile">
            {BUSINESS.ownerName}
            <div className="user-avatar">D</div>
          </div>
        </header>

        <div className="page-content">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'appointments' && <Appointments />}
          {activeTab === 'finances' && <Finances />}
          {activeTab === 'ambient' && <Ambient />}
          {activeTab === 'chat' && <ChatDemo />}
        </div>
      </main>
    </div>
  );
}

export default App;
