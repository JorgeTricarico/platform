import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ClientNotifications from './ClientNotifications';
import type { DBNotification } from '../services/api';

vi.mock('../services/api', () => ({
  fetchNotifications: vi.fn(),
  fetchClients: vi.fn().mockResolvedValue([]),
}));

import { fetchNotifications } from '../services/api';
const mockFetch = fetchNotifications as ReturnType<typeof vi.fn>;

const sampleNotifs: DBNotification[] = [
  {
    id: 'n1', clientId: 'cli-1',
    message: 'Tu pedido #56 esta listo para retirar.',
    type: 'prenda_lista', read: false, audience: 'client',
    createdAt: '2026-05-17T10:00:00.000Z',
  },
  {
    id: 'n2', clientId: 'cli-2',
    message: 'Tu pedido #57 esta listo para retirar.',
    type: 'prenda_lista', read: true, audience: 'client',
    createdAt: '2026-05-16T10:00:00.000Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(sampleNotifs);
});

describe('ClientNotifications page', () => {
  it('pide al backend solo notificaciones audience=client', async () => {
    render(<ClientNotifications />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('all', 'client');
    });
  });

  it('renderiza los mensajes en una lista', async () => {
    render(<ClientNotifications />);
    await waitFor(() => {
      expect(screen.getByText(/#56/)).toBeInTheDocument();
      expect(screen.getByText(/#57/)).toBeInTheDocument();
    });
  });

  it('muestra empty state si no hay avisos', async () => {
    mockFetch.mockResolvedValue([]);
    render(<ClientNotifications />);
    await waitFor(() => {
      expect(screen.getByText(/sin avisos|sin notificaciones/i)).toBeInTheDocument();
    });
  });

  it('muestra el titulo de pagina', async () => {
    render(<ClientNotifications />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /avisos a clientes/i })).toBeInTheDocument();
    });
  });
});
