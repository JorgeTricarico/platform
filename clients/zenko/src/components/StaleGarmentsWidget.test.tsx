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
      { id: '0001', orderNumber: 1, clientName: 'María', clientPhone: '111', status: 'listo', intakeDate: '2026-03-01', deliveryDate: tenDaysAgo, items: [{ id: 'I1', orderId: '0001', garmentName: 'Campera', repairType: 'cierre', description: '', price: 5000 }] },
    ]);

    render(<StaleGarmentsWidget />);
    await waitFor(() => {
      expect(screen.getByText('María')).toBeInTheDocument();
      expect(screen.getByText(/Campera/)).toBeInTheDocument();
      expect(screen.getByText(/10 dias/)).toBeInTheDocument();
    });
  });

  it('renders Avisar button with correct WhatsApp href', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0];
    (fetchStaleGarments as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: '0002', orderNumber: 2, clientName: 'Laura', clientPhone: '5491155554444', status: 'listo', intakeDate: '2026-03-01', deliveryDate: tenDaysAgo, items: [{ id: 'I2', orderId: '0002', garmentName: 'Vestido', repairType: 'entalle', description: '', price: 3000 }] },
    ]);

    render(<StaleGarmentsWidget />);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'Avisar' });
      expect(link).toBeInTheDocument();
      const expectedMsg = `Hola Laura, te recordamos que tu prenda "Vestido" está lista para retirar. ¡Te esperamos! 🧵`;
      const expectedHref = `whatsapp://send?phone=5491155554444&text=${encodeURIComponent(expectedMsg)}`;
      expect(link).toHaveAttribute('href', expectedHref);
      // target="_blank" removido — el scheme whatsapp:// abre la app, no una pestana nueva.
      // El fallback Web se abre programaticamente con window.open desde whatsappLinkProps.
    });
  });

  it('shows empty message when no stale garments', async () => {
    (fetchStaleGarments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(<StaleGarmentsWidget />);
    await waitFor(() => {
      expect(screen.getByText('No hay prendas pendientes de retiro.')).toBeInTheDocument();
    });
  });

  it('normaliza legacy 15 al renderizar URL de Avisar', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0];
    (fetchStaleGarments as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: '0003', orderNumber: 3, clientName: 'Sofía', clientPhone: '15-5057-9769', status: 'listo', intakeDate: '2026-03-01', deliveryDate: tenDaysAgo, items: [{ id: 'I3', orderId: '0003', garmentName: 'Pantalón', repairType: 'dobladillo', description: '', price: 2000 }] },
    ]);

    render(<StaleGarmentsWidget />);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'Avisar' });
      expect(link.getAttribute('href')).toMatch(/^whatsapp:\/\/send\?phone=5491150579769/);
    });
  });

  it('normaliza 11-XXXX-XXXX al renderizar URL', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0];
    (fetchStaleGarments as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: '0004', orderNumber: 4, clientName: 'Carla', clientPhone: '11-5057-9769', status: 'listo', intakeDate: '2026-03-01', deliveryDate: tenDaysAgo, items: [{ id: 'I4', orderId: '0004', garmentName: 'Camisa', repairType: 'parche', description: '', price: 1500 }] },
    ]);

    render(<StaleGarmentsWidget />);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'Avisar' });
      expect(link.getAttribute('href')).toMatch(/^whatsapp:\/\/send\?phone=5491150579769/);
    });
  });

  it('deshabilita botón Avisar si teléfono inválido', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0];
    (fetchStaleGarments as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: '0005', orderNumber: 5, clientName: 'Pedro', clientPhone: 'abc', status: 'listo', intakeDate: '2026-03-01', deliveryDate: tenDaysAgo, items: [{ id: 'I5', orderId: '0005', garmentName: 'Saco', repairType: 'cierre', description: '', price: 3000 }] },
    ]);

    render(<StaleGarmentsWidget />);
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: 'Avisar' });
      expect(btn).toBeDisabled();
    });
  });
});
