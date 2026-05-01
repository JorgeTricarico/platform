import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PublicStatus from './PublicStatus';

const mockOrder = {
  id: 'ord-1',
  orderNumber: 1,
  clientName: 'Juan Perez',
  garmentName: 'Pantalón',
  repairType: 'dobladillo',
  status: 'en_proceso',
  deliveryDate: '2026-04-15',
  price: 5000,
  deposit: 2000,
};

vi.mock('../services/api', () => ({
  fetchPublicStatus: vi.fn(),
}));

import { fetchPublicStatus } from '../services/api';

function setSearch(search: string) {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search },
    writable: true,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setSearch('?order=ord-1');
  (fetchPublicStatus as ReturnType<typeof vi.fn>).mockResolvedValue(mockOrder);
});

describe('PublicStatus', () => {
  it('muestra error si no hay orderId en la URL', async () => {
    setSearch('');
    render(<PublicStatus />);

    await waitFor(() => {
      expect(
        screen.getByText('No se proporcionó un código de orden válido.')
      ).toBeInTheDocument();
    });
  });

  it('muestra loading state inicialmente', () => {
    // Deja fetchPublicStatus colgado para observar el estado de carga
    (fetchPublicStatus as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    render(<PublicStatus />);

    expect(
      screen.getByText('Consultando el estado de tu prenda...')
    ).toBeInTheDocument();
  });

  it('muestra los datos de la orden cuando carga exitosamente', async () => {
    render(<PublicStatus />);

    await waitFor(() => {
      expect(screen.getByText('Pantalón')).toBeInTheDocument();
    });

    expect(screen.getByText('ORD-000001')).toBeInTheDocument();
    expect(screen.getByText('dobladillo')).toBeInTheDocument();
  });

  it('muestra el nombre del cliente y la prenda', async () => {
    render(<PublicStatus />);

    await waitFor(() => {
      const hero = screen.getByTestId('status-hero');
      expect(hero.textContent).toMatch(/Juan/);
      expect(hero.textContent).toMatch(/Pantalón/);
    });
  });

  it('muestra el stepper con el paso actual correcto (en_proceso)', async () => {
    render(<PublicStatus />);

    await waitFor(() => {
      expect(screen.getByText(/En Proceso/)).toBeInTheDocument();
    });

    // El badge "AHORA" debe estar visible junto al paso en_proceso
    expect(screen.getByText('AHORA')).toBeInTheDocument();
  });

  it('muestra hero banner con estado actual prominente', async () => {
    render(<PublicStatus />);
    await waitFor(() => {
      expect(screen.getByTestId('status-hero')).toBeInTheDocument();
    });
  });

  it('muestra mensaje especial cuando la prenda está lista', async () => {
    (fetchPublicStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockOrder, status: 'listo',
    });
    render(<PublicStatus />);
    await waitFor(() => {
      expect(screen.getByText(/lista para retirar/i)).toBeInTheDocument();
    });
  });

  it('muestra error si fetchPublicStatus falla', async () => {
    (fetchPublicStatus as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error')
    );
    render(<PublicStatus />);

    await waitFor(() => {
      expect(
        screen.getByText(
          'No pudimos encontrar tu pedido. Por favor, verifica el código en tu ticket.'
        )
      ).toBeInTheDocument();
    });
  });

  it('muestra otras prendas activas del cliente', async () => {
    (fetchPublicStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockOrder,
      otherActiveOrders: [
        {
          orderNumber: 2,
          garmentName: 'Camisa',
          repairType: 'cierre',
          status: 'en_proceso',
          deliveryDate: '2026-05-15',
        },
      ],
    });
    render(<PublicStatus />);

    await waitFor(() => {
      expect(screen.getByText('Tus otras prendas en el taller')).toBeInTheDocument();
    });

    expect(screen.getByText('Camisa')).toBeInTheDocument();
  });

  it('no muestra la sección si no hay otras prendas', async () => {
    (fetchPublicStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockOrder,
      // sin otherActiveOrders
    });
    render(<PublicStatus />);

    await waitFor(() => {
      expect(screen.getByText('Pantalón')).toBeInTheDocument();
    });

    expect(screen.queryByText('Tus otras prendas en el taller')).not.toBeInTheDocument();
  });
});
