import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Finances from './Finances';
import { ToastProvider } from '../components/ToastContext';

vi.mock('../services/api', () => ({
  fetchFinances: vi.fn(),
  createFinance: vi.fn(),
  updateFinance: vi.fn(),
  deleteFinance: vi.fn(),
}));

import { fetchFinances, updateFinance, deleteFinance } from '../services/api';

const mockFinances = [
  { id: 'FIN-1', date: '2026-04-01', type: 'income', category: 'Arreglos', amount: 4500, description: 'Test income' },
  { id: 'FIN-2', date: '2026-04-02', type: 'expense', category: 'Insumos', amount: 1500, description: 'Test expense' },
];

const mockFinanceEdit = { id: 'f1', date: '2026-04-01', type: 'income', category: 'Arreglo', amount: 5000, description: 'Pantalon' };

beforeEach(() => {
  vi.clearAllMocks();
  (fetchFinances as ReturnType<typeof vi.fn>).mockResolvedValue(mockFinances);
});

describe('Finances page', () => {
  it('renders finance stats correctly', async () => {
    render(<ToastProvider><Finances /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Ingresos Totales')).toBeInTheDocument();
      expect(screen.getByText('Gastos del Taller')).toBeInTheDocument();
      expect(screen.getByText('Ganancia Neta')).toBeInTheDocument();
    });
  });

  it('calculates totals from data', async () => {
    render(<ToastProvider><Finances /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('$4,500')).toBeInTheDocument();
      expect(screen.getByText('$1,500')).toBeInTheDocument();
      expect(screen.getByText('$3,000')).toBeInTheDocument();
    });
  });

  it('renders month filter input', async () => {
    render(<ToastProvider><Finances /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Ingresos Totales')).toBeInTheDocument();
    });
    const monthInput = document.querySelector('input[type="month"]');
    expect(monthInput).toBeInTheDocument();
    expect(monthInput).toHaveClass('input');
  });

  it('renders Todos filter button when month is selected', async () => {
    render(<ToastProvider><Finances /></ToastProvider>);
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
    render(<ToastProvider><Finances /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Ingresos Totales')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Nuevo Registro'));
    expect(document.querySelector('.modal-overlay')).toBeInTheDocument();
  });

  it('modal uses responsive CSS classes', async () => {
    render(<ToastProvider><Finances /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Ingresos Totales')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Nuevo Registro'));
    expect(document.querySelector('.modal-md')).toBeInTheDocument();
    expect(document.querySelector('.modal-card')).toBeInTheDocument();
  });
});

describe('Z16 — Edit finance', () => {
  it('renders Acciones column with Editar and Eliminar buttons', async () => {
    render(<ToastProvider><Finances /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Acciones')).toBeInTheDocument();
    });
    const editBtns = screen.getAllByText('Editar');
    const deleteBtns = screen.getAllByText('Eliminar');
    expect(editBtns.length).toBe(mockFinances.length);
    expect(deleteBtns.length).toBe(mockFinances.length);
  });

  it('opens edit modal pre-populated with finance data', async () => {
    (fetchFinances as ReturnType<typeof vi.fn>).mockResolvedValue([mockFinanceEdit]);
    render(<ToastProvider><Finances /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Arreglo')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Editar'));
    await waitFor(() => {
      expect(screen.getByText('Editar Registro')).toBeInTheDocument();
      const categoryInput = document.querySelector('input[name="category"]') as HTMLInputElement;
      expect(categoryInput.value).toBe('Arreglo');
      const amountInput = document.querySelector('input[name="amount"]') as HTMLInputElement;
      expect(amountInput.value).toBe('5000');
    });
  });

  it('calls updateFinance on edit submit', async () => {
    (fetchFinances as ReturnType<typeof vi.fn>).mockResolvedValue([mockFinanceEdit]);
    (updateFinance as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockFinanceEdit });
    render(<ToastProvider><Finances /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Arreglo')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Editar'));
    await waitFor(() => {
      expect(screen.getByText('Editar Registro')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => {
      expect(updateFinance).toHaveBeenCalledWith('f1', expect.objectContaining({ category: 'Arreglo', amount: 5000 }));
    });
  });
});

describe('Z16 — Delete finance', () => {
  it('calls deleteFinance when Eliminar is clicked and confirmed', async () => {
    (fetchFinances as ReturnType<typeof vi.fn>).mockResolvedValue([mockFinanceEdit]);
    (deleteFinance as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    window.confirm = vi.fn(() => true);
    render(<ToastProvider><Finances /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Arreglo')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Eliminar'));
    await waitFor(() => {
      expect(deleteFinance).toHaveBeenCalledWith('f1');
    });
  });
});
