import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Clients from './Clients';

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
}));

import { fetchClients, createClient, updateClient } from '../services/api';

beforeEach(() => {
  vi.clearAllMocks();
  (fetchClients as ReturnType<typeof vi.fn>).mockResolvedValue(mockClients);
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (updateClient as ReturnType<typeof vi.fn>).mockResolvedValue({});
});

describe('Clients page (zenko)', () => {
  it('renders client list', async () => {
    render(<Clients />);
    await waitFor(() => {
      expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
    });
  });

  it('opens edit modal when Editar is clicked', async () => {
    render(<Clients />);
    await waitFor(() => {
      expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Editar'));
    await waitFor(() => {
      expect(screen.getByText('Editar: Ana Lopez')).toBeInTheDocument();
    });
  });

  it('edit modal pre-populates with client data', async () => {
    render(<Clients />);
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
    render(<Clients />);
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
    render(<Clients />);
    await waitFor(() => {
      expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Nuevo Cliente'));
    expect(screen.getByText('Nuevo Cliente')).toBeInTheDocument();
    expect(document.querySelector('.modal-overlay')).toBeInTheDocument();
  });
});
