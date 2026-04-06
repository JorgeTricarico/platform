import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

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

function getApiBase(): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/damian';
  // Remove last path segment (e.g., /zenco or /damian) to get base
  return apiUrl.replace(/\/[^/]+$/, '');
}

function decodeTokenPayload(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { id: payload.userId, email: payload.email, name: payload.name || payload.email, role: payload.role, business: payload.business };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [loading, setLoading] = useState(true);

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
  }, []);

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
    localStorage.setItem('auth_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const loginAsDemo = () => {
    setUser({ id: 'demo', email: 'demo', name: 'Demo', role: 'admin', business: 'all' });
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
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
