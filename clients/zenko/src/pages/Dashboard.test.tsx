import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import { ToastProvider } from '../components/ToastContext';

const mockGarments = [
  {
    id: 'ORD-001', orderNumber: 1, clientName: 'María G.', clientPhone: '11-4567-8901',
    garmentName: 'Campera de Cuero', repairType: 'cierre',
    description: 'Cambiar cierre', status: 'en_proceso',
    intakeDate: '2026-04-01', deliveryDate: '2026-04-05', price: 15000
  },
  {
    id: 'ORD-002', orderNumber: 2, clientName: 'Juan P.', clientPhone: '11-1234-5678',
    garmentName: 'Pantalón', repairType: 'dobladillo',
    description: 'Dobladillo', status: 'entregado',
    intakeDate: '2026-04-02', deliveryDate: '2026-04-01', price: 5000
  }
];

const mockDashboard = {
  byStatus: { en_proceso: 1, entregado: 1 },
  todayDeliveries: [],
  upcomingDeliveries: [],
  monthlyIncome: 4500,
  monthlyExpenses: 1500,
};

vi.mock('../services/api', () => ({
  fetchGarments: vi.fn(),
  fetchDashboard: vi.fn(),
  fetchStaleGarments: vi.fn(),
  createGarment: vi.fn(),
}));

import { fetchGarments, fetchDashboard, fetchStaleGarments } from '../services/api';

beforeEach(() => {
  vi.clearAllMocks();
  (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(mockGarments);
  (fetchDashboard as ReturnType<typeof vi.fn>).mockResolvedValue(mockDashboard);
  (fetchStaleGarments as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

describe('Dashboard view', () => {
  it('renders the welcome message', async () => {
    render(<ToastProvider><Dashboard /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Hola, Ana 👋')).toBeInTheDocument();
    });
  });

  it('shows monthly income from dashboard data', async () => {
    render(<ToastProvider><Dashboard /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('$4,500')).toBeInTheDocument();
    });
  });

  it('calculates the balance correctly from dashboard data', async () => {
    render(<ToastProvider><Dashboard /></ToastProvider>);
    const expectedBalance = mockDashboard.monthlyIncome - mockDashboard.monthlyExpenses;
    await waitFor(() => {
      expect(screen.getByText(`$${expectedBalance.toLocaleString()}`)).toBeInTheDocument();
    });
  });

  it('displays the list of urgent garments', async () => {
    render(<ToastProvider><Dashboard /></ToastProvider>);
    await waitFor(() => {
      // Both mobile card and desktop table render in jsdom (no CSS media queries)
      const matches = screen.getAllByText('Campera de Cuero');
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});
