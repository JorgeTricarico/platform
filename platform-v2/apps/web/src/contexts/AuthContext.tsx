import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import {
  getToken,
  getStoredUser,
  storeAuthResult,
  clearAuth,
  isAuthenticated as checkIsAuthenticated,
  isTokenExpiringSoon,
  loginRequest,
  refreshTokenRequest,
  logoutRequest,
  type StoredUser,
} from '@platform/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User extends StoredUser {
  tenantId: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  /** True if the backend requires auth (non-demo mode) */
  authRequired: boolean;
  loading: boolean;
  login: (name: string, password?: string) => Promise<void>;
  loginAsDemo: () => void;
  logout: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_USER: User = {
  id: 'demo',
  name: 'Demo',
  role: 'admin',
  business: 'demo',
  tenantId: 'demo',
};

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
  apiUrl: string;
  tenantSlug: string;
}

export function AuthProvider({ children, apiUrl, tenantSlug }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = () => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  const scheduleRefresh = useCallback(
    (expiresAt: number) => {
      clearRefreshTimer();
      const msUntilRefresh = expiresAt - Date.now() - 5 * 60 * 1000; // 5 min before
      if (msUntilRefresh <= 0) {
        // Token already expiring — try to refresh immediately
        refreshTokenRequest(apiUrl, tenantSlug)
          .then((res) => {
            if (!res) return;
            setToken(res.token);
            scheduleRefresh(res.expiresAt);
          })
          .catch(() => {/* noop — will prompt re-login */});
        return;
      }
      refreshTimerRef.current = setTimeout(async () => {
        const res = await refreshTokenRequest(apiUrl, tenantSlug);
        if (res) {
          setToken(res.token);
          scheduleRefresh(res.expiresAt);
        }
      }, msUntilRefresh);
    },
    [apiUrl, tenantSlug],
  );

  const logout = useCallback(() => {
    clearRefreshTimer();
    logoutRequest(apiUrl, tenantSlug);
    setToken(null);
    setUser(null);
  }, [apiUrl, tenantSlug]);

  // Initialise from storage on mount
  useEffect(() => {
    const storedToken = getToken();
    const storedUser = getStoredUser();
    if (storedToken && storedUser && checkIsAuthenticated()) {
      setToken(storedToken);
      setUser({ ...storedUser, tenantId: storedUser.business });
      if (!isTokenExpiringSoon()) {
        // We don't know exact expiresAt here, but storage has it
        const raw = window.localStorage.getItem('platform_token_expires_at');
        const expiresAt = raw ? parseInt(raw, 10) : 0;
        if (expiresAt) scheduleRefresh(expiresAt);
      }
    } else if (storedToken) {
      // Token expired — clear
      clearAuth();
    }
    // Check if backend requires auth
    fetch(`${apiUrl}/api/${tenantSlug}/auth/status`, { signal: AbortSignal.timeout(3000) })
      .then((r) => r.json())
      .then((d: { authRequired?: boolean }) => setAuthRequired(d.authRequired ?? true))
      .catch(() => setAuthRequired(true))
      .finally(() => setLoading(false));
  }, [apiUrl, tenantSlug, scheduleRefresh]);

  useEffect(() => () => clearRefreshTimer(), []);

  const login = useCallback(
    async (name: string, password = '') => {
      const res = await loginRequest(apiUrl, tenantSlug, { name, password });
      storeAuthResult(res);
      setToken(res.token);
      setUser({
        id: res.user.id,
        name: res.user.name,
        role: res.user.role,
        business: res.user.business,
        tenantId: res.user.business,
      });
      scheduleRefresh(res.expiresAt);
    },
    [apiUrl, tenantSlug, scheduleRefresh],
  );

  const loginAsDemo = useCallback(() => {
    clearAuth();
    setToken('demo');
    setUser(DEMO_USER);
  }, []);

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        authRequired,
        loading,
        login,
        loginAsDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('[useAuth] Must be used inside <AuthProvider>');
  return ctx;
}
