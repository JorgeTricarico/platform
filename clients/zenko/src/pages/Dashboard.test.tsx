import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import { ToastProvider } from '../components/ToastContext';

const mockGarments = [
  {
    id: 'ORD-001', clientName: 'María G.', clientPhone: '11-4567-8901',
    garmentName: 'Campera de Cuero', repairType: 'cierre',
    description: 'Cambiar cierre', status: 'en_proceso',
    intakeDate: '2026-04-01', deliveryDate: '2026-04-05', price: 15000
  },
  {
    id: 'ORD-002', clientName: 'Juan P.', clientPhone: '11-1234-5678',
    garmentName: 'Pantalón', repairType: 'dobladillo',
    description: 'Dobladillo', status: 'entregado',
    intakeDate: '2026-04-02', deliveryDate: '2026-04-01', price: 5000
  }
];

const mockFinances = [
  { id: 'FIN-1', date: '2026-04-01', type: 'income', category: 'Arreglos', amount: 4500, description: 'Camisa' },
  { id: 'FIN-2', date: '2026-04-02', type: 'expense', category: 'Insumos', amount: 1500, description: 'Hilos' },
];

vi.mock('../services/api', () => ({
  fetchGarments: vi.fn(),
  fetchFinances: vi.fn(),
  createGarment: vi.fn(),
}));

import { fetchGarments, fetchFinances } from '../services/api';

beforeEach(() => {
  vi.clearAllMocks();
  (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(mockGarments);
  (fetchFinances as ReturnType<typeof vi.fn>).mockResolvedValue(mockFinances);
});

describe('Dashboard view', () => {
  it('renders the welcome message', async () => {
    render(<ToastProvider><Dashboard /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Hola, Ana 👋')).toBeInTheDocument();
    });
  });

  it('calculates the balance correctly based on data', async () => {
    render(<ToastProvider><Dashboard /></ToastProvider>);
    const totalIncome = mockFinances.filter(f => f.type === 'income').reduce((a, b) => a + b.amount, 0);
    const totalExpenses = mockFinances.filter(f => f.type === 'expense').reduce((a, b) => a + b.amount, 0);
    const expectedBalance = totalIncome - totalExpenses;

    await waitFor(() => {
      expect(screen.getByText(`$${expectedBalance.toLocaleString()}`)).toBeInTheDocument();
    });
  });

  it('displays the list of urgent garments', async () => {
    render(<ToastProvider><Dashboard /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero')).toBeInTheDocument();
    });
  });
});
