import { useState, type FormEvent } from 'react';
import { useAuth } from '../components/AuthContext';
import logoUrl from '../assets/logo_mg.png';

export default function Login() {
  const { login, loginAsDemo, authRequired } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(name, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-(--color-background)">
      <div className="bg-(--color-card) rounded-2xl shadow-sm border border-(--color-border) w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <img
            src={logoUrl}
            alt="MG Masajes Logo"
            className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3"
          />
          <h1 className="text-2xl font-extrabold text-(--color-foreground) m-0">
            Damian<span className="text-(--color-primary)">.masajes</span>
          </h1>
          <p className="text-(--color-muted-foreground) text-sm mt-2">Inicia sesion para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-(--color-foreground)">Nombre</label>
            <input
              className="w-full px-3 py-2 rounded-md border border-(--color-border) bg-(--color-card) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tu nombre"
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-(--color-foreground)">Contrasena</label>
            <input
              className="w-full px-3 py-2 rounded-md border border-(--color-border) bg-(--color-card) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Tu contrasena"
              required
            />
          </div>

          <button
            className="w-full inline-flex items-center justify-center px-5 py-3 rounded-full bg-(--color-primary) text-white font-semibold hover:bg-(--color-accent) transition-all disabled:opacity-60 mt-1"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesion'}
          </button>
        </form>

        {!authRequired && (
          <button
            className="w-full mt-3 px-5 py-3 rounded-full bg-transparent border border-(--color-border) text-(--color-muted-foreground) font-semibold hover:bg-(--color-muted) transition-colors"
            onClick={loginAsDemo}
          >
            Probar Demo
          </button>
        )}
      </div>
    </div>
  );
}
