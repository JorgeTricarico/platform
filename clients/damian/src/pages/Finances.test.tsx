import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Finances from './Finances';

vi.mock('../services/api', () => ({
  fetchFinances: vi.fn(),
  createFinance: vi.fn(),
}));

const mockFinances = [
  { id: 'FIN-1', date: '2026-04-01', type: 'income', category: 'Sesiones', amount: 8000, description: 'Masaje' },
  { id: 'FIN-2', date: '2026-04-02', type: 'expense', category: 'Insumos', amount: 2000, description: 'Aceites' },
];

import { fetchFinances } from '../services/api';

describe('Finances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchFinances as ReturnType<typeof vi.fn>).mockResolvedValue(mockFinances);
  });

  it('renders finance stats correctly', async () => {
    render(<Finances />);
    await waitFor(() => {
      expect(screen.getByText('Ingresos Totales')).toBeDefined();
      expect(screen.getByText('Gastos del Consultorio')).toBeDefined();
      expect(screen.getByText('Ganancia Neta')).toBeDefined();
    });
  });

  it('calculates totals from data', async () => {
    render(<Finances />);
    await waitFor(() => {
      expect(screen.getByText('$8,000')).toBeDefined();
      expect(screen.getByText('$2,000')).toBeDefined();
    });
  });

  it('renders month filter input', async () => {
    render(<Finances />);
    await waitFor(() => {
      expect(screen.getByText('Ingresos Totales')).toBeDefined();
    });
    const monthInput = document.querySelector('input[type="month"]');
    expect(monthInput).not.toBeNull();
    expect(monthInput!.className).toContain('input');
  });

  it('renders Todos filter button', async () => {
    render(<Finances />);
    await waitFor(() => {
      expect(screen.getByText('Ingresos Totales')).toBeDefined();
    });
    const monthInput = document.querySelector('input[type="month"]') as HTMLInputElement;
    fireEvent.change(monthInput, { target: { value: '2026-04' } });
    await waitFor(() => {
      const todosBtn = screen.getByText('Todos');
      expect(todosBtn.className).toContain('btn btn-filter');
    });
  });

  it('opens create modal on button click', async () => {
    render(<Finances />);
    await waitFor(() => {
      expect(screen.getByText('Ingresos Totales')).toBeDefined();
    });
    fireEvent.click(screen.getByText('+ Nuevo Registro'));
    await waitFor(() => {
      expect(document.querySelector('.modal-overlay')).not.toBeNull();
    });
  });

  it('modal uses responsive CSS classes', async () => {
    render(<Finances />);
    await waitFor(() => {
      expect(screen.getByText('Ingresos Totales')).toBeDefined();
    });
    fireEvent.click(screen.getByText('+ Nuevo Registro'));
    await waitFor(() => {
      const modalCard = document.querySelector('.modal-card');
      expect(modalCard).not.toBeNull();
      expect(modalCard!.className).toContain('modal-sm');
    });
  });
});
