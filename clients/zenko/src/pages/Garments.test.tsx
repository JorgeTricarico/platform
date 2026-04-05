import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Garments from './Garments';

vi.mock('../services/api', () => ({
  fetchGarments: vi.fn(),
  createGarment: vi.fn(),
  updateGarment: vi.fn(),
  deleteGarment: vi.fn(),
}));
vi.mock('../services/generateTicket', () => ({
  generateTicket: vi.fn(),
}));
vi.mock('../components/PhotoGallery', () => ({
  default: () => <div data-testid="photo-gallery" />,
}));

import { fetchGarments } from '../services/api';

const mockGarments = [
  {
    id: 'ORD-001', clientName: 'María G.', clientPhone: '11-4567-8901',
    garmentName: 'Campera de Cuero', repairType: 'cierre',
    description: 'Cambiar cierre', status: 'en_proceso',
    intakeDate: '2026-04-01', deliveryDate: '2026-04-05', price: 15000, location: 'Estante A'
  },
  {
    id: 'ORD-002', clientName: 'Juan P.', clientPhone: '11-1234-5678',
    garmentName: 'Pantalón', repairType: 'dobladillo',
    description: 'Dobladillo', status: 'recibido',
    intakeDate: '2026-04-02', deliveryDate: '2026-04-06', price: 5000, location: ''
  }
];

beforeEach(() => {
  vi.clearAllMocks();
  (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(mockGarments);
});

describe('Garments page', () => {
  it('renders the garments table with data', async () => {
    render(<Garments />);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
      expect(screen.getByText('Pantalón (dobladillo)')).toBeInTheDocument();
    });
  });

  it('displays location column', async () => {
    render(<Garments />);
    await waitFor(() => {
      expect(screen.getByText('Ubicación')).toBeInTheDocument();
      expect(screen.getByText('Estante A')).toBeInTheDocument();
    });
  });

  it('shows Ticket button for each garment', async () => {
    render(<Garments />);
    await waitFor(() => {
      const ticketButtons = screen.getAllByText('Ticket');
      expect(ticketButtons).toHaveLength(2);
    });
  });

  it('renders search input with correct CSS class', async () => {
    render(<Garments />);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Buscar por cliente, prenda o nro orden...');
    expect(searchInput).toHaveClass('input-search');
  });

  it('opens create modal on button click', async () => {
    render(<Garments />);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    expect(document.querySelector('.modal-overlay')).toBeInTheDocument();
  });

  it('modal uses responsive CSS classes', async () => {
    render(<Garments />);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    expect(document.querySelector('.modal-card')).toBeInTheDocument();
  });

  it('form uses CSS utility classes', async () => {
    render(<Garments />);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    expect(document.querySelector('.form-group')).toBeInTheDocument();
    expect(document.querySelector('.form-actions')).toBeInTheDocument();
  });
});
