import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Clients from './Clients';
import { ToastProvider } from '../components/ToastContext';

const mockClients = [
  {
    id: 'c1',
    name: 'Ana Lopez',
    phone: '1234567890',
    altPhone: null,
    email: 'ana@test.com',
    business: 'zenco',
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

vi.mock('../services/api', () => ({
  fetchClients: vi.fn(),
  searchClients: vi.fn(),
  createClient: vi.fn().mockResolvedValue({}),
  updateClient: vi.fn().mockResolvedValue({}),
  fetchClientOrders: vi.fn(),
}));

import { fetchClients, createClient, updateClient, fetchClientOrders } from '../services/api';

beforeEach(() => {
  vi.clearAllMocks();
  (fetchClients as ReturnType<typeof vi.fn>).mockResolvedValue(mockClients);
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (updateClient as ReturnType<typeof vi.fn>).mockResolvedValue({});
});

describe('Clients page (zenko)', () => {
  it('renders client list', async () => {
    render(<ToastProvider><Clients /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
    });
  });

  it('opens edit modal when Editar is clicked', async () => {
    render(<ToastProvider><Clients /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Editar'));
    await waitFor(() => {
      expect(screen.getByText('Editar: Ana Lopez')).toBeInTheDocument();
    });
  });

  it('edit modal pre-populates with client data', async () => {
    render(<ToastProvider><Clients /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Editar'));
    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('Nombre completo') as HTMLInputElement;
      expect(nameInput.value).toBe('Ana Lopez');
    });
  });

  it('calls updateClient (NOT createClient) on edit submit', async () => {
    render(<ToastProvider><Clients /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Editar'));
    await waitFor(() => {
      expect(screen.getByText('Editar: Ana Lopez')).toBeInTheDocument();
    });

    const saveButtons = screen.getAllByText('Guardar');
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      expect(updateClient).toHaveBeenCalledWith('c1', expect.objectContaining({ name: 'Ana Lopez' }));
      expect(createClient).not.toHaveBeenCalled();
    });
  });

  it('renders create form when + Nuevo Cliente is clicked', async () => {
    render(<ToastProvider><Clients /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Nuevo Cliente'));
    expect(screen.getByText('Nuevo Cliente')).toBeInTheDocument();
    expect(document.querySelector('.modal-overlay')).toBeInTheDocument();
  });
});

describe('Z18 — Historial de órdenes por cliente', () => {
  const mockOrders = {
    client: mockClients[0],
    orders: [
      {
        id: 'ORD-001', clientName: 'Ana Lopez', clientPhone: '1234567890',
        garmentName: 'Campera', repairType: 'cierre', description: 'Cambiar cierre',
        status: 'entregado', intakeDate: '2026-03-01', deliveryDate: '2026-03-05', price: 15000
      },
      {
        id: 'ORD-002', clientName: 'Ana Lopez', clientPhone: '1234567890',
        garmentName: 'Pantalón', repairType: 'dobladillo', description: 'Dobladillo',
        status: 'listo', intakeDate: '2026-04-01', deliveryDate: '2026-04-05', price: 5000
      }
    ],
    summary: { totalOrders: 2, totalGarments: 2, garmentsByStatus: { entregado: 1, listo: 1 } }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (fetchClients as ReturnType<typeof vi.fn>).mockResolvedValue(mockClients);
    (fetchClientOrders as ReturnType<typeof vi.fn>).mockResolvedValue(mockOrders);
  });

  it('renders "Ver historial" button per client row', async () => {
    render(<ToastProvider><Clients /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
    });
    expect(screen.getByText('Ver historial')).toBeInTheDocument();
  });

  it('calls fetchClientOrders when "Ver historial" is clicked', async () => {
    render(<ToastProvider><Clients /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Ver historial'));
    await waitFor(() => {
      expect(fetchClientOrders).toHaveBeenCalledWith('c1');
    });
  });

  it('shows historial modal with client orders', async () => {
    render(<ToastProvider><Clients /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Ver historial'));
    await waitFor(() => {
      expect(screen.getByText('Campera (cierre)')).toBeInTheDocument();
      expect(screen.getByText('Pantalón (dobladillo)')).toBeInTheDocument();
    });
  });

  it('shows summary stats in historial modal', async () => {
    render(<ToastProvider><Clients /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Ver historial'));
    await waitFor(() => {
      expect(screen.getByText(/2 órdenes/i)).toBeInTheDocument();
    });
  });
});
