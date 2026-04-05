import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Finances from './Finances';

vi.mock('../services/api', () => ({
  fetchFinances: vi.fn(),
  createFinance: vi.fn(),
}));

import { fetchFinances } from '../services/api';

const mockFinances = [
  { id: 'FIN-1', date: '2026-04-01', type: 'income', category: 'Arreglos', amount: 4500, description: 'Test income' },
  { id: 'FIN-2', date: '2026-04-02', type: 'expense', category: 'Insumos', amount: 1500, description: 'Test expense' },
];

beforeEach(() => {
  vi.clearAllMocks();
  (fetchFinances as ReturnType<typeof vi.fn>).mockResolvedValue(mockFinances);
});

describe('Finances page', () => {
  it('renders finance stats correctly', async () => {
    render(<Finances />);
    await waitFor(() => {
      expect(screen.getByText('Ingresos Totales')).toBeInTheDocument();
      expect(screen.getByText('Gastos del Taller')).toBeInTheDocument();
      expect(screen.getByText('Ganancia Neta')).toBeInTheDocument();
    });
  });

  it('calculates totals from data', async () => {
    render(<Finances />);
    await waitFor(() => {
      expect(screen.getByText('$4,500')).toBeInTheDocument();
      expect(screen.getByText('$1,500')).toBeInTheDocument();
      expect(screen.getByText('$3,000')).toBeInTheDocument();
    });
  });

  it('renders month filter input', async () => {
    render(<Finances />);
    await waitFor(() => {
      expect(screen.getByText('Ingresos Totales')).toBeInTheDocument();
    });
    const monthInput = document.querySelector('input[type="month"]');
    expect(monthInput).toBeInTheDocument();
    expect(monthInput).toHaveClass('input');
  });

  it('renders Todos filter button when month is selected', async () => {
    render(<Finances />);
    await waitFor(() => {
      expect(screen.getByText('Ingresos Totales')).toBeInTheDocument();
    });
    const monthInput = document.querySelector('input[type="month"]') as HTMLInputElement;
    fireEvent.change(monthInput, { target: { value: '2026-04' } });
    await waitFor(() => {
      const todosBtn = screen.getByText('Todos');
      expect(todosBtn).toBeInTheDocument();
      expect(todosBtn).toHaveClass('btn', 'btn-filter');
    });
  });

  it('opens create modal on button click', async () => {
    render(<Finances />);
    await waitFor(() => {
      expect(screen.getByText('Ingresos Totales')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Nuevo Registro'));
    expect(document.querySelector('.modal-overlay')).toBeInTheDocument();
  });

  it('modal uses responsive CSS classes', async () => {
    render(<Finances />);
    await waitFor(() => {
      expect(screen.getByText('Ingresos Totales')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Nuevo Registro'));
    expect(document.querySelector('.modal-sm')).toBeInTheDocument();
    expect(document.querySelector('.modal-card')).toBeInTheDocument();
  });
});
