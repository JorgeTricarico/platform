/**
 * Root App component.
 *
 * Provides all global contexts:
 *   - TenantContext  — tenant config & theme
 *   - AuthContext    — JWT auth state
 *   - ToastContext   — toast notifications
 *
 * Routing is done with a simple tab-based navigator (no react-router needed
 * for this single-page app). The active tab is driven by feature flags in the
 * tenant config.
 */
import { Suspense, lazy, useState } from 'react';
import type { TenantConfig } from '@platform/config';
import { AuthProvider, useAuth } from './contexts/AuthContext.js';
import { ToastProvider } from './contexts/ToastContext.js';
import { TenantContext } from './contexts/TenantContext.js';
import { OfflineIndicator } from './components/OfflineIndicator.js';

// Lazy-load pages for code splitting
const Login = lazy(() => import('./pages/Login.js'));
const Dashboard = lazy(() => import('./pages/Dashboard.js'));

interface AppProps {
  tenant: TenantConfig;
}

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Cargando…</p>
      </div>
    </div>
  );
}

function AppShell({ tenant }: AppProps) {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return <PageFallback />;
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <OfflineIndicator />
      {!isAuthenticated ? (
        <Login tenant={tenant} />
      ) : (
        <Dashboard tenant={tenant} activeTab={activeTab} onNavigate={setActiveTab} />
      )}
    </Suspense>
  );
}

export default function App({ tenant }: AppProps) {
  const apiBaseUrl = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '/api';

  return (
    <TenantContext.Provider value={tenant}>
      <ToastProvider>
        <AuthProvider tenant={tenant} apiBaseUrl={apiBaseUrl}>
          <AppShell tenant={tenant} />
        </AuthProvider>
      </ToastProvider>
    </TenantContext.Provider>
  );
}
