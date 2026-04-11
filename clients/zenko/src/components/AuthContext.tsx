import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  business: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  authRequired: boolean;
  loading: boolean;
  login: (name: string, password: string) => Promise<void>;
  loginAsDemo: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

import { API_BASE } from '../services/config';

function getApiBase(): string {
  return `${API_BASE}/api`;
}

interface TokenPayload {
  userId: string;
  email: string;
  name?: string;
  role: string;
  business: string;
  exp?: number;
}

function decodeTokenPayload(token: string): (User & { exp?: number }) | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as TokenPayload;
    return {
      id: payload.userId,
      email: payload.email,
      name: payload.name || payload.email,
      role: payload.role,
      business: payload.business,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

// Returns ms until refresh should fire (5 minutes before expiry), or null if no expiry
function msUntilRefresh(exp: number | undefined): number | null {
  if (!exp) return null;
  const expiresInMs = exp * 1000 - Date.now();
  const refreshInMs = expiresInMs - 5 * 60 * 1000; // 5 minutes before expiry
  return refreshInMs > 0 ? refreshInMs : 0;
}

export function AuthProvider({ children }: { children: ReactNode }) {
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

  const logout = useCallback(() => {
    clearRefreshTimer();
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  }, []);

  const scheduleRefresh = useCallback((currentToken: string, exp: number | undefined) => {
    clearRefreshTimer();
    const delay = msUntilRefresh(exp);
    if (delay === null) return; // no expiry (demo/offline tokens), skip

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${getApiBase()}/auth/refresh`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        if (!res.ok) {
          logout();
          return;
        }
        const data = await res.json() as { token: string };
        const decoded = decodeTokenPayload(data.token);
        if (!decoded) {
          logout();
          return;
        }
        localStorage.setItem('auth_token', data.token);
        setToken(data.token);
        // Schedule the next refresh cycle
        scheduleRefresh(data.token, decoded.exp);
      } catch {
        // Network error during refresh — keep existing session, retry later
        scheduleRefresh(currentToken, exp);
      }
    }, delay);
  }, [logout]);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch(`${getApiBase()}/auth/status`);
        const data = await res.json();

        setAuthRequired(data.requireAuth);

        // Check for saved token
        const savedToken = localStorage.getItem('auth_token');
        if (savedToken) {
          const decoded = decodeTokenPayload(savedToken);
          if (decoded) {
            setToken(savedToken);
            setUser(decoded);
            scheduleRefresh(savedToken, decoded.exp);
          } else {
            localStorage.removeItem('auth_token');
          }
        }
      } catch {
        // If can't reach server, allow access (offline mode)
        setUser({ id: 'offline', email: 'offline', name: 'Offline', role: 'admin', business: 'all' });
      } finally {
        setLoading(false);
      }
    };
    init();

    return () => {
      clearRefreshTimer();
    };
  }, [scheduleRefresh]);

  const login = async (name: string, password: string) => {
    const res = await fetch(`${getApiBase()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al iniciar sesion');
    }
    const data = await res.json();
    const decoded = decodeTokenPayload(data.token);
    localStorage.setItem('auth_token', data.token);
    setToken(data.token);
    setUser(data.user);
    if (decoded) scheduleRefresh(data.token, decoded.exp);
  };

  const loginAsDemo = () => {
    clearRefreshTimer();
    setUser({ id: 'demo', email: 'demo', name: 'Demo', role: 'admin', business: 'all' });
  };


  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, authRequired, loading, login, loginAsDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
