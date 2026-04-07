import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StaleGarmentsWidget from './StaleGarmentsWidget';

vi.mock('../services/api', () => ({
  fetchStaleGarments: vi.fn(),
}));

import { fetchStaleGarments } from '../services/api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StaleGarmentsWidget', () => {
  it('renders stale garments with client name and days overdue', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0];
    (fetchStaleGarments as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: '0001', clientName: 'María', clientPhone: '111', garmentName: 'Campera', repairType: 'cierre', description: '', status: 'listo', intakeDate: '2026-03-01', deliveryDate: tenDaysAgo, price: 5000 },
    ]);

    render(<StaleGarmentsWidget />);
    await waitFor(() => {
      expect(screen.getByText('María')).toBeInTheDocument();
      expect(screen.getByText(/Campera — cierre/)).toBeInTheDocument();
      expect(screen.getByText(/10 dias/)).toBeInTheDocument();
    });
  });

  it('shows empty message when no stale garments', async () => {
    (fetchStaleGarments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(<StaleGarmentsWidget />);
    await waitFor(() => {
      expect(screen.getByText('No hay prendas pendientes de retiro.')).toBeInTheDocument();
    });
  });
});
