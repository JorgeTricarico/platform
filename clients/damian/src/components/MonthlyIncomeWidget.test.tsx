import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MonthlyIncomeWidget from './MonthlyIncomeWidget';

vi.mock('../services/api', () => ({
  fetchDashboardMonthlyIncome: vi.fn(),
}));

import { fetchDashboardMonthlyIncome } from '../services/api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MonthlyIncomeWidget', () => {
  it('renders monthly income and balance', async () => {
    (fetchDashboardMonthlyIncome as ReturnType<typeof vi.fn>).mockResolvedValue({
      monthlyIncome: 15000,
      monthlyExpenses: 2000,
    });

    render(<MonthlyIncomeWidget />);
    await waitFor(() => {
      expect(screen.getByText('$15,000')).toBeInTheDocument();
      expect(screen.getByText(/Balance: \$13,000/)).toBeInTheDocument();
      expect(screen.getByText(/Gastos: \$2,000/)).toBeInTheDocument();
    });
  });

  it('renders zero when no finances', async () => {
    (fetchDashboardMonthlyIncome as ReturnType<typeof vi.fn>).mockResolvedValue({
      monthlyIncome: 0,
      monthlyExpenses: 0,
    });

    render(<MonthlyIncomeWidget />);
    await waitFor(() => {
      expect(screen.getByText('$0')).toBeInTheDocument();
    });
  });
});
