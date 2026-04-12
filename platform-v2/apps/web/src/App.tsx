/**
 * Root App component.
 *
 * Provides all global contexts:
 *   - TenantContext  — tenant config & theme
 *   - AuthContext    — JWT auth state
 *   - ToastContext   — toast notifications
 *
 * Hash-based routing drives page selection:
 *   #dashboard | #garments | #appointments | #patients | #clients | #finances | #chat | #settings
 *
 * All pages are lazy-loaded for code splitting.
 */
import { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import type { TenantConfig } from '@platform/types';
import { AuthProvider, useAuth } from './contexts/AuthContext.js';
import { ToastProvider } from './contexts/ToastContext.js';
import { TenantContext } from './contexts/TenantContext.js';
import { MainLayout } from './layouts/MainLayout.js';
import { OfflineIndicator } from './components/OfflineIndicator.js';
import type { NavTab } from './layouts/Sidebar.js';

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────

const Login       = lazy(() => import('./pages/Login.js'));
const Dashboard   = lazy(() => import('./pages/Dashboard.js'));
const Garments    = lazy(() => import('./pages/Garments.js'));
const Appointments = lazy(() => import('./pages/Appointments.js'));
const Clients     = lazy(() => import('./pages/Clients.js'));
const Patients    = lazy(() => import('./pages/Patients.js'));
const Finances    = lazy(() => import('./pages/Finances.js'));
const ChatDemo    = lazy(() => import('./pages/ChatDemo.js'));
const Settings    = lazy(() => import('./pages/Settings.js'));

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppProps {
  tenant: TenantConfig;
}

// ─── Loading fallback ─────────────────────────────────────────────────────────

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Cargando…</p>
      </div>
    </div>
  );
}

function FullPageFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Cargando…</p>
      </div>
    </div>
  );
}

// ─── Hash routing helper ──────────────────────────────────────────────────────

const VALID_TABS: NavTab[] = [
  'dashboard',
  'garments',
  'appointments',
  'clients',
  'patients',
  'finances',
  'chat',
  'settings',
];

function getTabFromHash(): NavTab {
  const hash = window.location.hash.replace('#', '') as NavTab;
  return VALID_TABS.includes(hash) ? hash : 'dashboard';
}

// ─── Page renderer ────────────────────────────────────────────────────────────

interface PageProps {
  tab: NavTab;
  tenant: TenantConfig;
  onNavigate: (tab: NavTab) => void;
}

function ActivePage({ tab, tenant, onNavigate }: PageProps) {
  switch (tab) {
    case 'dashboard':
      return <Dashboard tenant={tenant} onNavigate={onNavigate} />;
    case 'garments':
      return <Garments tenant={tenant} />;
    case 'appointments':
      return <Appointments tenant={tenant} />;
    case 'clients':
      return <Clients tenant={tenant} />;
    case 'patients':
      return <Patients tenant={tenant} />;
    case 'finances':
      return <Finances tenant={tenant} />;
    case 'chat':
      return <ChatDemo tenant={tenant} />;
    case 'settings':
      return <Settings tenant={tenant} />;
    default:
      return <Dashboard tenant={tenant} onNavigate={onNavigate} />;
  }
}

// ─── App Shell (authenticated) ────────────────────────────────────────────────

function AppShell({ tenant }: AppProps) {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>(getTabFromHash);

  // Sync tab ↔ hash
  const navigate = useCallback((tab: NavTab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const tab = getTabFromHash();
      setActiveTab(tab);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (loading) {
    return <FullPageFallback />;
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<FullPageFallback />}>
        <OfflineIndicator />
        <Login tenant={tenant} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<FullPageFallback />}>
      <OfflineIndicator />
      <MainLayout tenant={tenant} activeTab={activeTab} onNavigate={navigate}>
        <Suspense fallback={<PageFallback />}>
          <ActivePage tab={activeTab} tenant={tenant} onNavigate={navigate} />
        </Suspense>
      </MainLayout>
    </Suspense>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App({ tenant }: AppProps) {
  const apiBaseUrl = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '/api';

  return (
    <TenantContext.Provider value={tenant}>
      <ToastProvider>
        <AuthProvider apiUrl={apiBaseUrl} tenantSlug={tenant.slug}>
          <AppShell tenant={tenant} />
        </AuthProvider>
      </ToastProvider>
    </TenantContext.Provider>
  );
}
