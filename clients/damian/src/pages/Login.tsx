import { useState, type FormEvent } from 'react';
import { useAuth } from '../components/AuthContext';
import logoUrl from '../assets/logo.svg';

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary, #f5f0eb)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src={logoUrl} alt="Damian Logo" style={{ width: 64, height: 64, borderRadius: '16px', objectFit: 'cover', marginBottom: '0.5rem' }} />
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Damian<span style={{ color: 'var(--primary-color)' }}>.masajes</span></h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>Inicia sesion para continuar</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Nombre</label>
            <input
              className="input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tu nombre"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Contrasena</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Tu contrasena"
              required
            />
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesion'}
          </button>
        </form>

        {!authRequired && (
          <button
            className="btn"
            onClick={loginAsDemo}
            style={{ width: '100%', marginTop: '1rem', background: 'transparent', border: '1px solid var(--border-color, #ddd)', color: 'var(--text-secondary)' }}
          >
            Probar Demo
          </button>
        )}
      </div>
    </div>
  );
}
