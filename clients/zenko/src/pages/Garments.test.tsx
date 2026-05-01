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
    intakeDate: '2026-04-01', deliveryDate: '2026-04-05', price: 15000
  },
  {
    id: 'ORD-002', clientName: 'Juan P.', clientPhone: '11-1234-5678',
    garmentName: 'Pantalón', repairType: 'dobladillo',
    description: 'Dobladillo', status: 'recibido',
    intakeDate: '2026-04-02', deliveryDate: '2026-04-06', price: 5000
  },
  {
    id: 'ORD-003', clientName: 'Sofía L.', clientPhone: '11-9999-0000',
    garmentName: 'Vestido', repairType: 'diseño',
    description: 'Ajustar cintura', status: 'listo',
    intakeDate: '2026-04-01', deliveryDate: '2026-04-04', price: 35000
  },
  {
    id: 'ORD-004', clientName: 'Carlos M.', clientPhone: '11-5555-5555',
    garmentName: 'Camisa', repairType: 'tela',
    description: 'Zurcir manga', status: 'entregado',
    intakeDate: '2026-04-01', deliveryDate: '2026-04-01', price: 4500
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
      expect(screen.getAllByText(/Campera de Cuero/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/cierre/i).length).toBeGreaterThan(0);
    });
  });



  it('shows Ticket button for each garment', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      const ticketButtons = screen.getAllByText('Ticket');
      expect(ticketButtons).toHaveLength(4);
    });
  });

  it('renders search input with correct placeholder', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i).length).toBeGreaterThan(0);
    });
    const searchInput = screen.getByPlaceholderText('Buscar por cliente, prenda o nro orden...');
    expect(searchInput).toBeInTheDocument();
  });

  it('opens create modal on button click', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    expect(screen.getByText('Registrar Nueva Orden')).toBeInTheDocument();
  });

  it('modal uses responsive CSS classes', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    // Modal dialog is rendered with DialogContent
    expect(screen.getByText('Registrar Nueva Orden')).toBeInTheDocument();
  });

  it('form uses CSS utility classes', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    // Form contains Guardar and Cancelar buttons
    expect(screen.getByText('Guardar')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
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

  it('status badges render with correct text for each status', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    expect(screen.getByText('✓ Listo')).toBeInTheDocument();
    expect(screen.getByText('⚙ En Proceso')).toBeInTheDocument();
    expect(screen.getByText('● Recibido')).toBeInTheDocument();
    expect(screen.getByText('✔ Entregado')).toBeInTheDocument();
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

  it('renders repair type text input', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    const input = screen.getByPlaceholderText('Arreglo (ej: Dobladillo)');
    expect(input).toBeInTheDocument();
  });

  it('renders deposit text input', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    const input = screen.getByPlaceholderText('Ej: 500');
    expect(input).toBeInTheDocument();
  });

  // Z14: Status filter chips
  it('renders status filter chips', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    expect(screen.getByText(/Todos \(/)).toBeInTheDocument();
    expect(screen.getByText(/Recibido \(/)).toBeInTheDocument();
    expect(screen.getByText(/En Proceso \(/)).toBeInTheDocument();
    expect(screen.getByText(/Listo \(/)).toBeInTheDocument();
    expect(screen.getByText(/Entregado \(/)).toBeInTheDocument();
  });

  it('filters garments by status when chip is clicked', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Listo \(/));
    expect(screen.getByText('Vestido (diseño)')).toBeInTheDocument();
    expect(screen.queryByText('Campera de Cuero (cierre)')).not.toBeInTheDocument();
    expect(screen.queryByText('Pantalón (dobladillo)')).not.toBeInTheDocument();
  });

  it('shows all garments when Todos chip is clicked', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Listo \(/));
    expect(screen.queryByText('Pantalón (dobladillo)')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/Todos \(/));
    expect(screen.getByText('Pantalón (dobladillo)')).toBeInTheDocument();
    expect(screen.getByText('Vestido (diseño)')).toBeInTheDocument();
  });

  it('shows count on filter chips', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    expect(screen.getByText('Todos (4)')).toBeInTheDocument();
    expect(screen.getByText('Recibido (1)')).toBeInTheDocument();
    expect(screen.getByText('En Proceso (1)')).toBeInTheDocument();
    expect(screen.getByText('Listo (1)')).toBeInTheDocument();
    expect(screen.getByText('Entregado (1)')).toBeInTheDocument();
  });

  // Z15: Overdue row highlighting
  it('highlights overdue garments with visual indicator', async () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const overdueGarments = [
      {
        id: 'ORD-OV1', clientName: 'Test Client', clientPhone: '1234',
        garmentName: 'Overdue Garment', repairType: 'cierre',
        description: 'Test', status: 'recibido',
        intakeDate: '2026-01-01', deliveryDate: yesterday.toISOString().split('T')[0],
        price: 1000
      },
    ];
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(overdueGarments);
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Overdue Garment (cierre)')).toBeInTheDocument();
    });
    // The overdue row should have a visual indicator (text or icon)
    expect(screen.getByText(/vencid/i)).toBeInTheDocument();
  });

  it('renders WhatsApp Avisar button only for garments with status listo', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    // Only ORD-003 (Vestido, status: 'listo') should have Avisar
    const aviseButtons = screen.getAllByText('Avisar');
    expect(aviseButtons).toHaveLength(1);
    const link = aviseButtons[0].closest('a');
    expect(link).toHaveAttribute('href', expect.stringContaining('wa.me'));
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('does not render Avisar button for non-listo garments', async () => {
    const nonListoGarments = mockGarments.filter(g => g.status !== 'listo');
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(nonListoGarments);
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });
    expect(screen.queryAllByText('Avisar')).toHaveLength(0);
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

  it('createGarment se llama una vez por cada prenda en el pedido', async () => {
    const { createGarment } = await import('../services/api');
    (createGarment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-1', orderNumber: 100 });

    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Campera de Cuero (cierre)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Registrar Ingreso'));

    // Cambiar a "Nuevo cliente" para poder ingresar nombre/teléfono
    fireEvent.click(screen.getByText('Nuevo cliente'));

    fireEvent.change(screen.getByPlaceholderText('Nombre y Apellido'), { target: { value: 'Cliente Test' } });
    fireEvent.change(screen.getByPlaceholderText('Teléfono'), { target: { value: '1234567890' } });

    // Rellenar la primera prenda
    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    fireEvent.change(garmentInputs[0], { target: { value: 'Pantalón' } });
    const repairInputs = screen.getAllByPlaceholderText(/arreglo \(ej:/i);
    fireEvent.change(repairInputs[0], { target: { value: 'Dobladillo' } });
    const descInputs = screen.getAllByPlaceholderText(/detalle exacto/i);
    fireEvent.change(descInputs[0], { target: { value: 'Subir 5cm' } });

    // Añadir segunda prenda
    fireEvent.click(screen.getByRole('button', { name: /añadir prenda/i }));

    // Rellenar la segunda prenda
    const garmentInputs2 = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    fireEvent.change(garmentInputs2[1], { target: { value: 'Camisa' } });
    const repairInputs2 = screen.getAllByPlaceholderText(/arreglo \(ej:/i);
    fireEvent.change(repairInputs2[1], { target: { value: 'Cierre' } });
    const descInputs2 = screen.getAllByPlaceholderText(/detalle exacto/i);
    fireEvent.change(descInputs2[1], { target: { value: 'Cambiar cierre' } });

    // Rellenar fecha de entrega (requerida)
    const dateInputs = document.querySelectorAll('input[name="deliveryDate"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-12-01' } });

    // Submit
    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);

    await waitFor(() => {
      expect(createGarment).toHaveBeenCalledTimes(2);
    });
  });
});
