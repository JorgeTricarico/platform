import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Clients from './Clients';
import { ToastProvider } from '../components/ToastContext';
import { MemoryRouter } from 'react-router-dom';

const mockClients = [
  {
    id: 'c1',
    name: 'Carlos Ruiz',
    phone: '9876543210',
    altPhone: null,
    email: 'carlos@test.com',
    business: 'damian',
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

vi.mock('../services/api', () => ({
  fetchClients: vi.fn(),
  searchClients: vi.fn(),
  createClient: vi.fn().mockResolvedValue({}),
  updateClient: vi.fn().mockResolvedValue({}),
  fetchAppointments: vi.fn().mockResolvedValue([]),
  fetchFinances: vi.fn().mockResolvedValue([]),
  fetchPatients: vi.fn().mockResolvedValue([]),
}));

import { fetchClients, createClient, updateClient } from '../services/api';

beforeEach(() => {
  vi.clearAllMocks();
  (fetchClients as ReturnType<typeof vi.fn>).mockResolvedValue(mockClients);
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (updateClient as ReturnType<typeof vi.fn>).mockResolvedValue({});
});

describe('Clients page (damian)', () => {
  it('renders client list', async () => {
    render(<MemoryRouter><ToastProvider><Clients /></ToastProvider></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument();
    });
  });

  it('opens edit modal when Editar is clicked', async () => {
    render(<MemoryRouter><ToastProvider><Clients /></ToastProvider></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Editar'));
    await waitFor(() => {
      expect(screen.getByText('Editar: Carlos Ruiz')).toBeInTheDocument();
    });
  });

  it('edit modal pre-populates with client data', async () => {
    render(<MemoryRouter><ToastProvider><Clients /></ToastProvider></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Editar'));
    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('Nombre completo') as HTMLInputElement;
      expect(nameInput.value).toBe('Carlos Ruiz');
    });
  });

  it('calls updateClient (NOT createClient) on edit submit', async () => {
    render(<MemoryRouter><ToastProvider><Clients /></ToastProvider></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Editar'));
    await waitFor(() => {
      expect(screen.getByText('Editar: Carlos Ruiz')).toBeInTheDocument();
    });

    const saveButtons = screen.getAllByText('Guardar');
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      expect(updateClient).toHaveBeenCalledWith('c1', expect.objectContaining({ name: 'Carlos Ruiz' }));
      expect(createClient).not.toHaveBeenCalled();
    });
  });

  it('renders create form when + Nuevo Cliente is clicked', async () => {
    render(<MemoryRouter><ToastProvider><Clients /></ToastProvider></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Nuevo Cliente'));
    expect(screen.getByText('Nuevo Cliente')).toBeInTheDocument();
    expect(document.querySelector('.modal-overlay')).toBeInTheDocument();
  });
});
