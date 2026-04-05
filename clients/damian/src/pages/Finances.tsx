import { useEffect, useState } from 'react';
import { fetchFinances } from '../services/api';
import type { DBFinance } from '../services/api';

export default function Finances() {
  const [finances, setFinances] = useState<DBFinance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinances()
      .then(data => {
        // En un caso real, ordenamos por fecha.
        setFinances(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const totalIncome = finances.filter(f => f.type === 'income').reduce((acc, f) => acc + f.amount, 0);
  const totalExpenses = finances.filter(f => f.type === 'expense').reduce((acc, f) => acc + f.amount, 0);
  const netIncome = totalIncome - totalExpenses;

  if (loading) return <div>Cargando registros financieros...</div>;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '32px' }}>
        <div>
          <h1>Control Financiero</h1>
          <p className="subtitle">Lleva el registro de todo el capital ingresado y los gastos del consultorio.</p>
        </div>
        <button className="btn btn-primary">+ Nuevo Registro (Gasto/Ingreso)</button>
      </div>

      <div className="grid grid-cols-3" style={{ marginBottom: '40px' }}>
        <div className="card" style={{ borderTop: '4px solid var(--success-color)' }}>
          <div className="stat-title">Ingresos Totales</div>
          <div className="stat-value" style={{ color: 'var(--success-color)' }}>${totalIncome.toLocaleString()}</div>
        </div>
        <div className="card" style={{ borderTop: '4px solid var(--urgent-color)' }}>
          <div className="stat-title">Gastos del Consultorio</div>
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
                <th>Concepto / Descripción</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {finances.map(f => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600 }}>{new Date(f.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</td>
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
                  <td colSpan={3} style={{ textAlign: 'center', padding: '32px' }}>No hay registros financieros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
