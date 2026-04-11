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
  deleteClient: vi.fn().mockResolvedValue(undefined),
  fetchClientOrders: vi.fn(),
}));

import { fetchClients, createClient, updateClient, deleteClient, fetchClientOrders } from '../services/api';

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
      // Client name may appear in multiple layout elements (responsive table)
      const matches = screen.getAllByText('Ana Lopez');
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  it('opens edit modal when Editar is clicked', async () => {
    render(<ToastProvider><Clients /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText('Ana Lopez').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByText('Editar')[0]);
    await waitFor(() => {
      expect(screen.getByText('Editar: Ana Lopez')).toBeInTheDocument();
    });
  });

  it('edit modal pre-populates with client data', async () => {
    render(<ToastProvider><Clients /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText('Ana Lopez').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByText('Editar')[0]);
    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('Nombre completo') as HTMLInputElement;
      expect(nameInput.value).toBe('Ana Lopez');
    });
  });

  it('calls updateClient (NOT createClient) on edit submit', async () => {
    render(<ToastProvider><Clients /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText('Ana Lopez').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('Editar')[0]);
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
      expect(screen.getAllByText('Ana Lopez').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByText('+ Nuevo Cliente'));
    // Dialog opens with the "Nuevo Cliente" title
    expect(screen.getByText('Nuevo Cliente')).toBeInTheDocument();
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
      expect(screen.getAllByText('Ana Lopez').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Ver historial')).toBeInTheDocument();
  });

  it('calls fetchClientOrders when "Ver historial" is clicked', async () => {
    render(<ToastProvider><Clients /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText('Ana Lopez').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByText('Ver historial'));
    await waitFor(() => {
      expect(fetchClientOrders).toHaveBeenCalledWith('c1');
    });
  });

  it('shows historial modal with client orders', async () => {
    render(<ToastProvider><Clients /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText('Ana Lopez').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByText('Ver historial'));
    await waitFor(() => {
      // Orders appear in both mobile cards and desktop table; use getAllByText
      expect(screen.getAllByText('Campera (cierre)').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Pantalón (dobladillo)').length).toBeGreaterThan(0);
    });
  });

  it('shows summary stats in historial modal', async () => {
    render(<ToastProvider><Clients /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText('Ana Lopez').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByText('Ver historial'));
    await waitFor(() => {
      expect(screen.getByText(/2 órdenes/i)).toBeInTheDocument();
    });
  });
});

describe('Z20 — Eliminar cliente', () => {
  it('renders delete button and calls deleteClient on confirm', async () => {
    (fetchClients as ReturnType<typeof vi.fn>).mockResolvedValue(mockClients);
    window.confirm = vi.fn(() => true);

    render(<ToastProvider><Clients /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText('Ana Lopez').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByText('Eliminar'));
    expect(window.confirm).toHaveBeenCalledWith('¿Eliminar a Ana Lopez? Esta acción no se puede deshacer.');
    await waitFor(() => {
      expect(deleteClient).toHaveBeenCalledWith('c1');
    });
  });
});
