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

import { fetchFinances, createFinance, updateFinance, deleteFinance } from '../services/api';

const mockFinances = [
  { id: 'FIN-1', date: '2026-04-01', type: 'income', category: 'Sesiones', amount: 8000, description: 'Masaje' },
  { id: 'FIN-2', date: '2026-04-02', type: 'expense', category: 'Insumos', amount: 2000, description: 'Aceites' },
];

const mockFinanceEdit = { id: 'f1', date: '2026-04-01', type: 'income', category: 'Sesion', amount: 5000, description: 'Masaje relajante' };

describe('Finances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchFinances as ReturnType<typeof vi.fn>).mockResolvedValue(mockFinances);
  });

  it('renders finance stats correctly', async () => {
    render(<ToastProvider><Finances /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Ingresos Totales')).toBeDefined();
      expect(screen.getByText('Gastos del Consultorio')).toBeDefined();
      expect(screen.getByText('Ganancia Neta')).toBeDefined();
    });
  });

  it('calculates totals from data', async () => {
    render(<ToastProvider><Finances /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('$8,000')).toBeDefined();
      expect(screen.getByText('$2,000')).toBeDefined();
    });
  });

  it('renders month filter input', async () => {
    render(<ToastProvider><Finances /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Ingresos Totales')).toBeDefined();
    });
    const monthInput = document.querySelector('input[type="month"]');
    expect(monthInput).not.toBeNull();
    expect(monthInput!.className).toContain('input');
  });

  it('renders Todos filter button', async () => {
    render(<ToastProvider><Finances /></ToastProvider>);
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
    render(<ToastProvider><Finances /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Ingresos Totales')).toBeDefined();
    });
    fireEvent.click(screen.getByText('+ Nuevo Registro'));
    await waitFor(() => {
      expect(document.querySelector('.modal-overlay')).not.toBeNull();
    });
  });

  it('modal uses responsive CSS classes', async () => {
    render(<ToastProvider><Finances /></ToastProvider>);
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

describe('D19 — Edit finance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchFinances as ReturnType<typeof vi.fn>).mockResolvedValue(mockFinances);
  });

  it('renders Acciones column with Editar and Eliminar buttons', async () => {
    render(<ToastProvider><Finances /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Acciones')).toBeDefined();
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
      expect(screen.getByText('Sesion')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Editar'));
    await waitFor(() => {
      expect(screen.getByText('Editar Registro')).toBeDefined();
      const categoryInput = document.querySelector('input[name="category"]') as HTMLInputElement;
      expect(categoryInput.value).toBe('Sesion');
      const amountInput = document.querySelector('input[name="amount"]') as HTMLInputElement;
      expect(amountInput.value).toBe('5000');
    });
  });

  it('calls updateFinance on edit submit', async () => {
    (fetchFinances as ReturnType<typeof vi.fn>).mockResolvedValue([mockFinanceEdit]);
    (updateFinance as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockFinanceEdit });
    render(<ToastProvider><Finances /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Sesion')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Editar'));
    await waitFor(() => {
      expect(screen.getByText('Editar Registro')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => {
      expect(updateFinance).toHaveBeenCalledWith('f1', expect.objectContaining({ category: 'Sesion', amount: 5000 }));
    });
  });
});

describe('D28 — Independent submitting states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchFinances as ReturnType<typeof vi.fn>).mockResolvedValue([mockFinanceEdit]);
  });

  it('submitting edit form does not disable create form button', async () => {
    let resolveCreate!: () => void;
    (createFinance as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise<void>(res => { resolveCreate = res; })
    );
    (updateFinance as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockFinanceEdit });

    render(<ToastProvider><Finances /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Sesion')).toBeDefined();
    });

    fireEvent.click(screen.getByText('+ Nuevo Registro'));
    await waitFor(() => {
      expect(document.querySelector('.modal-overlay')).not.toBeNull();
    });

    const categoryInput = document.querySelector('input[name="category"]') as HTMLInputElement;
    fireEvent.change(categoryInput, { target: { value: 'TestCategory' } });
    const amountInput = document.querySelector('input[name="amount"]') as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: '1000' } });

    const form = document.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(createFinance).toHaveBeenCalled();
    });

    const saveButtons = screen.getAllByText('Guardando...');
    expect(saveButtons.length).toBe(1);

    fireEvent.click(screen.getByText('Cancelar'));

    fireEvent.click(screen.getByText('Editar'));
    await waitFor(() => {
      expect(screen.getByText('Editar Registro')).toBeDefined();
    });

    const editSaveBtn = screen.getByText('Guardar');
    expect((editSaveBtn as HTMLButtonElement).disabled).toBe(false);

    resolveCreate();
  });

  it('submitting edit form does not disable the create button', async () => {
    let resolveUpdate!: () => void;
    (updateFinance as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise<void>(res => { resolveUpdate = res; })
    );

    render(<ToastProvider><Finances /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Sesion')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Editar'));
    await waitFor(() => {
      expect(screen.getByText('Editar Registro')).toBeDefined();
    });

    const editForm = document.querySelector('form') as HTMLFormElement;
    fireEvent.submit(editForm);

    await waitFor(() => {
      expect(updateFinance).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Cancelar'));

    fireEvent.click(screen.getByText('+ Nuevo Registro'));
    await waitFor(() => {
      expect(screen.getByText('Nuevo Registro Financiero')).toBeDefined();
    });

    const createSaveBtn = screen.getByText('Guardar');
    expect((createSaveBtn as HTMLButtonElement).disabled).toBe(false);

    resolveUpdate();
  });
});

describe('D19 — Delete finance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchFinances as ReturnType<typeof vi.fn>).mockResolvedValue(mockFinances);
  });

  it('calls deleteFinance when Eliminar is clicked and confirmed', async () => {
    (fetchFinances as ReturnType<typeof vi.fn>).mockResolvedValue([mockFinanceEdit]);
    (deleteFinance as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    window.confirm = vi.fn(() => true);
    render(<ToastProvider><Finances /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Sesion')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Eliminar'));
    await waitFor(() => {
      expect(deleteFinance).toHaveBeenCalledWith('f1');
    });
  });
});
