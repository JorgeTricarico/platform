import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { TenantConfig } from '@platform/config';

interface LoginProps {
  tenant: TenantConfig;
}

export default function Login({ tenant }: LoginProps) {
  const { login, loginAsDemo, authRequired } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor ingresá tu nombre.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(name.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = `hsl(${tenant.theme.primaryHsl})`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        {/* Brand card */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg"
            style={{ backgroundColor: primaryColor }}
          >
            {tenant.brandLabel.slice(0, 2).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {tenant.brandLabel}
            <span className="text-muted-foreground font-normal">{tenant.brandSuffix}</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{tenant.subtitle}</p>
        </div>

        {/* Login form */}
        <div className="bg-card rounded-2xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-5">Iniciar sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1.5">
                Nombre
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tenant.ownerName}
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow placeholder:text-muted-foreground"
                disabled={loading}
              />
            </div>

            {authRequired && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow placeholder:text-muted-foreground"
                  disabled={loading}
                />
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          {/* Demo mode */}
          <div className="mt-4 pt-4 border-t">
            <button
              type="button"
              onClick={loginAsDemo}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Entrar en modo demo
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {tenant.name} · {tenant.address}
        </p>
      </div>
    </div>
  );
}
