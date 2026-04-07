import { useEffect, useState } from 'react';
import { fetchDashboardMonthlyIncome } from '../services/api';
import type { MonthlyIncomeData } from '../services/api';

export default function MonthlyIncomeWidget() {
  const [data, setData] = useState<MonthlyIncomeData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetchDashboardMonthlyIncome()
      .then(setData)
      .catch(err => console.error('Error cargando ingresos:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener('dashboard-refresh', onRefresh);
    return () => window.removeEventListener('dashboard-refresh', onRefresh);
  }, []);

  if (loading) return <div className="card"><p>Cargando ingresos...</p></div>;

  const income = data?.monthlyIncome ?? 0;
  const expenses = data?.monthlyExpenses ?? 0;
  const balance = income - expenses;

  return (
    <div className="card">
      <div className="stat-title">Ingresos del Mes</div>
      <div className="stat-value" style={{ color: 'var(--success-color, #22c55e)' }}>${income.toLocaleString()}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
        <span>Gastos: ${expenses.toLocaleString()}</span>
        <span style={{ fontWeight: 600, color: balance >= 0 ? 'var(--success-color, #22c55e)' : 'var(--urgent-color)' }}>
          Balance: ${balance.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
