import { useEffect, useState } from 'react';
import { fetchFinances, createFinance } from '../services/api';
import type { DBFinance } from '../services/api';

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  type: 'income',
  category: '',
  amount: 0,
  description: ''
};

export default function Finances() {
  const [finances, setFinances] = useState<DBFinance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterMonth, setFilterMonth] = useState('');

  const load = (month?: string) => {
    setLoading(true);
    fetchFinances(month || undefined)
      .then(data => {
        setFinances(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setLoading(false);
      })
      .catch(err => { console.error(err); setLoading(false); });
  };

  useEffect(() => { load(filterMonth); }, [filterMonth]);

  const totalIncome = finances.filter(f => f.type === 'income').reduce((acc, f) => acc + f.amount, 0);
  const totalExpenses = finances.filter(f => f.type === 'expense').reduce((acc, f) => acc + f.amount, 0);
  const netIncome = totalIncome - totalExpenses;

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createFinance({ ...form, amount: Number(form.amount) });
      setIsModalOpen(false);
      setForm({ ...EMPTY_FORM });
      load(filterMonth);
    } catch {
      alert('Error al guardar el registro');
    }
  };

  if (loading && finances.length === 0) return <div>Cargando registros financieros...</div>;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '32px' }}>
        <div>
          <h1>Control Financiero</h1>
          <p className="subtitle">Lleva el registro de todo el capital ingresado y los gastos del taller.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Nuevo Registro</button>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px' }}>
        <input
          type="month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontFamily: 'inherit', fontSize: '14px' }}
        />
        {filterMonth && (
          <button
            className="btn"
            onClick={() => setFilterMonth('')}
            style={{ padding: '10px 16px', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 600, borderRadius: '8px' }}
          >
            Todos
          </button>
        )}
      </div>

      <div className="grid grid-cols-3" style={{ marginBottom: '40px' }}>
        <div className="card" style={{ borderTop: '4px solid var(--success-color)' }}>
          <div className="stat-title">Ingresos Totales</div>
          <div className="stat-value" style={{ color: 'var(--success-color)' }}>${totalIncome.toLocaleString()}</div>
        </div>
        <div className="card" style={{ borderTop: '4px solid var(--urgent-color)' }}>
          <div className="stat-title">Gastos del Taller</div>
          <div className="stat-value" style={{ color: 'var(--urgent-color)' }}>${totalExpenses.toLocaleString()}</div>
        </div>
        <div className="card" style={{ borderTop: '4px solid var(--primary-color)' }}>
          <div className="stat-title">Ganancia Neta</div>
          <div className="stat-value">${netIncome.toLocaleString()}</div>
        </div>
      </div>

      <h2>Últimos Movimientos</h2>
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Concepto / Descripción</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {finances.map(f => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600 }}>{new Date(f.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}</td>
                  <td>
                    <span className={`badge ${f.type === 'income' ? 'completed' : 'pending'}`}>
                      {f.type === 'income' ? 'Ingreso' : 'Gasto'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{f.category}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{f.description}</div>
                  </td>
                  <td style={{ fontWeight: 800, color: f.type === 'income' ? 'var(--success-color)' : 'var(--urgent-color)' }}>
                    {f.type === 'income' ? '+' : '-'}${f.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
              {finances.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '32px' }}>No hay registros financieros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Registro */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '420px', padding: '32px' }}>
            <h2 style={{ marginTop: 0 }}>Nuevo Registro Financiero</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <select
                  name="type"
                  value={form.type}
                  onChange={handle}
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                  <option value="income">Ingreso</option>
                  <option value="expense">Gasto</option>
                </select>
                <input
                  required
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={handle}
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                />
              </div>
              <input
                required
                name="category"
                placeholder={form.type === 'income' ? 'Ej: Arreglo Pantalón' : 'Ej: Hilo y Agujas'}
                value={form.category}
                onChange={handle}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              />
              <input
                required
                name="amount"
                type="number"
                placeholder="Monto ($)"
                value={form.amount || ''}
                onChange={handle}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              />
              <input
                name="description"
                placeholder="Descripción adicional (opcional)"
                value={form.description}
                onChange={handle}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setForm({ ...EMPTY_FORM }); }}
                  style={{ padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
