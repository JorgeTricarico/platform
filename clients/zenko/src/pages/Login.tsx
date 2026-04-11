import { useState, type FormEvent } from 'react';
import { useAuth } from '../components/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import logoUrl from '../assets/logo.png';
import { BUSINESS } from '../config/business';

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
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 pb-6 px-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <img
              src={logoUrl}
              alt={`${BUSINESS.name} Logo`}
              className="w-16 h-16 rounded-2xl object-cover mb-3"
            />
            <h1 className="text-2xl font-bold text-foreground">
              {BUSINESS.brandLabel}<span className="text-primary">{BUSINESS.brandSuffix}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Inicia sesion para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 px-3 py-2.5 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nombre</label>
              <Input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Contrasena</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Tu contrasena"
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? 'Ingresando...' : 'Iniciar Sesion'}
            </Button>
          </form>

          {!authRequired && (
            <Button
              variant="outline"
              onClick={loginAsDemo}
              className="w-full mt-3"
            >
              Probar Demo
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
