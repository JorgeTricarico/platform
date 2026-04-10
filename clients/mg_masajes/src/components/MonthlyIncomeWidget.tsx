import React, { useEffect, useState } from 'react';
import { fetchDashboardMonthlyIncome } from '../services/api';
import type { MonthlyIncomeData } from '../services/api';
import { useDashboardRefresh } from './DashboardRefreshContext';
import { SkeletonCard } from './SkeletonLoader';

function MonthlyIncomeWidget() {
  const [data, setData] = useState<MonthlyIncomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const { refreshKey } = useDashboardRefresh();

  useEffect(() => {
    setLoading(true);
    fetchDashboardMonthlyIncome()
      .then(setData)
      .catch(err => console.error('Error cargando ingresos:', err))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return <SkeletonCard />;

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

export default React.memo(MonthlyIncomeWidget);
