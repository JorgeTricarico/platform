import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Garments from './Garments';
import { ToastProvider } from '../components/ToastContext';

vi.mock('../services/api', () => ({
  fetchGarments: vi.fn(),
  createGarment: vi.fn(),
  updateGarment: vi.fn(),
  deleteGarment: vi.fn(),
  searchClients: vi.fn().mockResolvedValue([]),
}));
vi.mock('../services/generateTicket', () => ({
  generateTicket: vi.fn(),
}));
vi.mock('../components/PhotoGallery', () => ({
  default: () => <div data-testid="photo-gallery" />,
}));

import { fetchGarments, searchClients } from '../services/api';

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
  },
  {
    id: 'ORD-003', clientName: 'Sofía L.', clientPhone: '11-9999-0000',
    garmentName: 'Vestido', repairType: 'diseño',
    description: 'Ajustar cintura', status: 'listo',
    intakeDate: '2026-04-01', deliveryDate: '2026-04-04', price: 35000, location: 'Perchero B'
  },
  {
    id: 'ORD-004', clientName: 'Carlos M.', clientPhone: '11-5555-5555',
    garmentName: 'Camisa', repairType: 'tela',
    description: 'Zurcir manga', status: 'entregado',
    intakeDate: '2026-04-01', deliveryDate: '2026-04-01', price: 4500, location: ''
  }
];

beforeEach(() => {
  vi.clearAllMocks();
  (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(mockGarments);
});

describe('Garments page', () => {
  it('renders the garments table with data', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
      expect(screen.getByText('Pantalón (dobladillo)')).toBeInTheDocument();
    });
  });

  it('displays location column', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Ubicación')).toBeInTheDocument();
      expect(screen.getByText('Estante A')).toBeInTheDocument();
    });
  });

  it('shows Ticket button for each garment', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      const ticketButtons = screen.getAllByText('Ticket');
      expect(ticketButtons).toHaveLength(4);
    });
  });

  it('renders search input with correct CSS class', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Buscar por cliente, prenda o nro orden...');
    expect(searchInput).toHaveClass('input-search');
  });

  it('opens create modal on button click', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    expect(document.querySelector('.modal-overlay')).toBeInTheDocument();
  });

  it('modal uses responsive CSS classes', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    expect(document.querySelector('.modal-card')).toBeInTheDocument();
  });

  it('form uses CSS utility classes', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    expect(document.querySelector('.form-group')).toBeInTheDocument();
    expect(document.querySelector('.form-actions')).toBeInTheDocument();
  });

  it('sorts garments by status: listo first, then en_proceso, recibido, entregado', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Vestido (diseño)')).toBeInTheDocument();
    });
    const rows = screen.getAllByRole('row').slice(1); // skip header
    expect(rows[0]).toHaveTextContent('Vestido'); // listo
    expect(rows[1]).toHaveTextContent('Campera de Cuero'); // en_proceso
    expect(rows[2]).toHaveTextContent('Pantalón'); // recibido
    expect(rows[3]).toHaveTextContent('Camisa'); // entregado
  });

  it('status badges have distinct symbols', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText(/Listo para Entrega/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Listo para Entrega/)).toHaveStyle({ color: '#2e7d32' });
    expect(screen.getByText(/En Proceso/)).toHaveStyle({ color: '#1565c0' });
    expect(screen.getByText(/Recibido/)).toHaveStyle({ color: '#e65100' });
    expect(screen.getByText(/Entregado/)).toHaveStyle({ color: '#757575' });
  });

  it('search filters by repairType and description', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Buscar por cliente, prenda o nro orden...');
    fireEvent.change(searchInput, { target: { value: 'zurcir' } });
    expect(screen.getByText('Camisa (tela)')).toBeInTheDocument();
    expect(screen.queryByText('Campera de Cuero (cierre)')).not.toBeInTheDocument();
  });

  it('create modal shows client mode toggle buttons', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    expect(screen.getByText('Cliente existente')).toBeInTheDocument();
    expect(screen.getByText('Nuevo cliente')).toBeInTheDocument();
  });

  it('create modal shows search input in existing client mode', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    expect(screen.getByPlaceholderText('Buscar cliente por nombre o teléfono...')).toBeInTheDocument();
  });

  it('create modal switches to new client mode with name/phone fields', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    fireEvent.click(screen.getByText('Nuevo cliente'));
    expect(screen.getByPlaceholderText('Nombre y Apellido')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Teléfono')).toBeInTheDocument();
  });

  it('repair type select includes Otro option', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    const select = screen.getByDisplayValue('Tipo de Arreglo...');
    expect(select).toBeInTheDocument();
    const options = Array.from(select.querySelectorAll('option')).map(o => o.textContent);
    expect(options).toContain('Otro...');
    expect(options).toContain('Arreglo de Tela');
  });

  it('selecting Otro shows custom text input', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    const select = screen.getByDisplayValue('Tipo de Arreglo...');
    fireEvent.change(select, { target: { value: 'otro' } });
    expect(screen.getByPlaceholderText('Escribí el tipo de arreglo...')).toBeInTheDocument();
  });

  it('client search calls searchClients API', async () => {
    (searchClients as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: '1', name: 'Ana García', phone: '11-1111-1111', business: 'zenco', createdAt: '2026-01-01' }
    ]);
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    const searchInput = screen.getByPlaceholderText('Buscar cliente por nombre o teléfono...');
    fireEvent.change(searchInput, { target: { value: 'Ana' } });
    await waitFor(() => {
      expect(searchClients).toHaveBeenCalledWith('Ana');
    }, { timeout: 500 });
  });
});
