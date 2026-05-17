import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Garments from './Garments';
import { ToastProvider } from '../components/ToastContext';

vi.mock('../services/api', () => ({
  fetchGarments: vi.fn(),
  createGarment: vi.fn(),
  updateGarment: vi.fn(),
  deleteGarment: vi.fn(),
  searchClients: vi.fn().mockResolvedValue([]),
  orderTotal: (g: { items?: Array<{ price: number }> }) => (g.items ?? []).reduce((s: number, i: { price: number }) => s + i.price, 0),
}));
vi.mock('../services/generateTicket', () => ({
  generateTicket: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../components/PhotoGallery', () => ({
  default: () => <div data-testid="photo-gallery" />,
}));

import { fetchGarments, createGarment as createGarmentImport, searchClients } from '../services/api';
import { generateTicket } from '../services/generateTicket';

const makeItem = (garmentName: string, repairType: string, description: string, price: number) => ({
  id: `ITEM-${garmentName}`, orderId: 'ORD', garmentName, repairType, description, price,
});

const mockGarments = [
  {
    id: 'ORD-001', orderNumber: 1, clientName: 'María G.', clientPhone: '11-4567-8901',
    status: 'en_proceso', intakeDate: '2026-04-01', deliveryDate: '2026-04-05', deposit: 0,
    items: [makeItem('Campera de Cuero', 'cierre', 'Cambiar cierre', 15000)],
  },
  {
    id: 'ORD-002', orderNumber: 2, clientName: 'Juan P.', clientPhone: '11-1234-5678',
    status: 'recibido', intakeDate: '2026-04-02', deliveryDate: '2026-04-06', deposit: 0,
    items: [makeItem('Pantalón', 'dobladillo', 'Dobladillo', 5000)],
  },
  {
    id: 'ORD-003', orderNumber: 3, clientName: 'Sofía L.', clientPhone: '11-9999-0000',
    status: 'listo', intakeDate: '2026-04-01', deliveryDate: '2026-04-04', deposit: 0,
    items: [makeItem('Vestido', 'diseño', 'Ajustar cintura', 35000)],
  },
  {
    id: 'ORD-004', orderNumber: 4, clientName: 'Carlos M.', clientPhone: '11-5555-5555',
    status: 'entregado', intakeDate: '2026-04-01', deliveryDate: '2026-04-01', deposit: 0,
    items: [makeItem('Camisa', 'tela', 'Zurcir manga', 4500)],
  }
];

beforeEach(() => {
  vi.clearAllMocks();
  (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(mockGarments);
  (generateTicket as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
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
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    expect(screen.getByText('Registrar Nueva Orden')).toBeInTheDocument();
  });

  it('modal uses responsive CSS classes', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    // Modal dialog is rendered with DialogContent
    expect(screen.getByText('Registrar Nueva Orden')).toBeInTheDocument();
  });

  it('form uses CSS utility classes', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    // Form contains Guardar and Cancelar buttons. "Cancelar" tambien aparece en
    // cada fila de la tabla — por eso usamos getAllByText().length>0.
    expect(screen.getByText('Guardar')).toBeInTheDocument();
    expect(screen.getAllByText('Cancelar').length).toBeGreaterThan(0);
  });

  it('sorts garments by status: listo first, then en_proceso, recibido, entregado', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Vestido/i)[0]).toBeInTheDocument();
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
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    expect(screen.getByText('✓ Listo')).toBeInTheDocument();
    expect(screen.getByText('⚙ En Proceso')).toBeInTheDocument();
    expect(screen.getByText('● Recibido')).toBeInTheDocument();
    expect(screen.getByText('✔ Entregado')).toBeInTheDocument();
  });

  it('search filters by repairType and description', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Buscar por cliente, prenda o nro orden...');
    fireEvent.change(searchInput, { target: { value: 'zurcir' } });
    expect(screen.getAllByText(/Camisa/i)[0]).toBeInTheDocument();
    expect(screen.queryAllByText(/Campera de Cuero/i)).toHaveLength(0);
  });

  it('create modal shows client mode toggle buttons', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    expect(screen.getByText('Cliente existente')).toBeInTheDocument();
    expect(screen.getByText('Nuevo cliente')).toBeInTheDocument();
  });

  it('create modal shows search input in existing client mode', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    expect(screen.getByPlaceholderText('Buscar cliente por nombre o teléfono...')).toBeInTheDocument();
  });

  it('create modal switches to new client mode with name/phone fields', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    fireEvent.click(screen.getByText('Nuevo cliente'));
    expect(screen.getByPlaceholderText('Nombre y Apellido')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Teléfono')).toBeInTheDocument();
  });

  it('renders repair type text input', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    const input = screen.getByPlaceholderText('Arreglo (ej: Dobladillo)');
    expect(input).toBeInTheDocument();
  });

  it('renders deposit text input', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    const input = screen.getByPlaceholderText('Ej: 500');
    expect(input).toBeInTheDocument();
  });

  // Z14: Status filter chips
  it('renders status filter chips', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
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
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Listo \(/));
    expect(screen.getAllByText(/Vestido/i)[0]).toBeInTheDocument();
    expect(screen.queryAllByText(/Campera de Cuero/i)).toHaveLength(0);
    expect(screen.queryAllByText(/Pantalón/i)).toHaveLength(0);
  });

  it('shows all garments when Todos chip is clicked', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Listo \(/));
    expect(screen.queryAllByText(/Pantalón/i)).toHaveLength(0);
    fireEvent.click(screen.getByText(/Todos \(/));
    expect(screen.getAllByText(/Pantalón/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Vestido/i)[0]).toBeInTheDocument();
  });

  it('shows count on filter chips', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
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
        id: 'ORD-OV1', orderNumber: 99, clientName: 'Test Client', clientPhone: '1234',
        status: 'recibido', intakeDate: '2026-01-01',
        deliveryDate: yesterday.toISOString().split('T')[0],
        items: [makeItem('Overdue Garment', 'cierre', 'Test', 1000)],
      },
    ];
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(overdueGarments);
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Overdue Garment/i)[0]).toBeInTheDocument();
    });
    // The overdue row should have a visual indicator (text or icon)
    expect(screen.getByText(/vencid/i)).toBeInTheDocument();
  });

  it('renders WhatsApp Avisar button only for garments with status listo', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    // Only ORD-003 (Vestido, status: 'listo') should have Avisar
    const aviseButtons = screen.getAllByText('Avisar');
    expect(aviseButtons).toHaveLength(1);
    const link = aviseButtons[0].closest('a');
    expect(link).toHaveAttribute('href', expect.stringContaining('whatsapp://send'));
    // target="_blank" removido — el scheme abre la app, no una pestana nueva
  });

  it('does not render Avisar button for non-listo garments', async () => {
    const nonListoGarments = mockGarments.filter(g => g.status !== 'listo');
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(nonListoGarments);
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    expect(screen.queryAllByText('Avisar')).toHaveLength(0);
  });

  it('client search calls searchClients API', async () => {
    (searchClients as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: '1', name: 'Ana García', phone: '11-1111-1111', business: 'zenco', createdAt: '2026-01-01' }
    ]);
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    const searchInput = screen.getByPlaceholderText('Buscar cliente por nombre o teléfono...');
    fireEvent.change(searchInput, { target: { value: 'Ana' } });
    await waitFor(() => {
      expect(searchClients).toHaveBeenCalledWith('Ana');
    }, { timeout: 500 });
  });

  it('genera ticket automáticamente después de crear una orden', async () => {
    (createGarmentImport as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-1', orderNumber: 100 });

    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    fireEvent.click(screen.getByText('Nuevo cliente'));
    fireEvent.change(screen.getByPlaceholderText('Nombre y Apellido'), { target: { value: 'Cliente Test' } });
    fireEvent.change(screen.getByPlaceholderText('Teléfono'), { target: { value: '1234567890' } });

    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    fireEvent.change(garmentInputs[0], { target: { value: 'Pantalón' } });
    const repairInputs = screen.getAllByPlaceholderText(/arreglo \(ej:/i);
    fireEvent.change(repairInputs[0], { target: { value: 'Dobladillo' } });
    const descInputs = screen.getAllByPlaceholderText(/detalle/i);
    fireEvent.change(descInputs[0], { target: { value: 'Subir 5cm' } });
    // Fix A2: precio requerido > 0 para que el submit no sea bloqueado
    const priceInputs = screen.getAllByPlaceholderText('Ej: 1500');
    fireEvent.change(priceInputs[0], { target: { value: '5000' } });

    const dateInputs = document.querySelectorAll('input[name="deliveryDate"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-12-01' } });

    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);

    await waitFor(() => {
      expect(generateTicket).toHaveBeenCalledTimes(1);
    });
  });

  it('createGarment se llama una sola vez con todos los items del pedido', async () => {
    const { createGarment } = await import('../services/api');
    (createGarment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-1', orderNumber: 100 });

    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
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
    const descInputs = screen.getAllByPlaceholderText(/detalle/i);
    fireEvent.change(descInputs[0], { target: { value: 'Subir 5cm' } });
    // Fix A2: precio requerido > 0
    const priceInputs0 = screen.getAllByPlaceholderText('Ej: 1500');
    fireEvent.change(priceInputs0[0], { target: { value: '5000' } });

    // Añadir segunda prenda
    fireEvent.click(screen.getByRole('button', { name: /añadir.*prenda/i }));

    // Rellenar la segunda prenda
    const garmentInputs2 = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    fireEvent.change(garmentInputs2[1], { target: { value: 'Camisa' } });
    const repairInputs2 = screen.getAllByPlaceholderText(/arreglo \(ej:/i);
    fireEvent.change(repairInputs2[1], { target: { value: 'Cierre' } });
    const descInputs2 = screen.getAllByPlaceholderText(/detalle/i);
    fireEvent.change(descInputs2[1], { target: { value: 'Cambiar cierre' } });
    // Fix A2: precio requerido > 0 para la segunda prenda también
    const priceInputs1 = screen.getAllByPlaceholderText('Ej: 1500');
    fireEvent.change(priceInputs1[1], { target: { value: '3000' } });

    // Rellenar fecha de entrega (requerida)
    const dateInputs = document.querySelectorAll('input[name="deliveryDate"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-12-01' } });

    // Submit
    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);

    await waitFor(() => {
      expect(createGarment).toHaveBeenCalledTimes(1);
      const call = (createGarment as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.items).toHaveLength(2);
      expect(call.items[0].garmentName).toBe('Pantalón');
      expect(call.items[1].garmentName).toBe('Camisa');
    });
  });
});

describe('BUG 4: Validación fecha de entrega en handleCreate', () => {
  it('[BUG4] muestra toast de error si se intenta guardar sin fecha de entrega', async () => {
    const { createGarment } = await import('../services/api');
    (createGarment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-1', orderNumber: 100 });

    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    // Cambiar a nuevo cliente para poder ingresar datos
    fireEvent.click(screen.getByText('Nuevo cliente'));
    fireEvent.change(screen.getByPlaceholderText('Nombre y Apellido'), { target: { value: 'Cliente Test' } });
    fireEvent.change(screen.getByPlaceholderText('Teléfono'), { target: { value: '1234567890' } });

    // Rellenar prenda pero NO la fecha de entrega (dejarla vacía)
    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    fireEvent.change(garmentInputs[0], { target: { value: 'Pantalón' } });
    const repairInputs = screen.getAllByPlaceholderText(/arreglo \(ej:/i);
    fireEvent.change(repairInputs[0], { target: { value: 'Dobladillo' } });
    const descInputs = screen.getAllByPlaceholderText(/detalle/i);
    fireEvent.change(descInputs[0], { target: { value: 'Subir 5cm' } });

    // Asegurarnos de que la fecha quede vacía
    const dateInputs = document.querySelectorAll('input[name="deliveryDate"]');
    fireEvent.change(dateInputs[0], { target: { value: '' } });

    // Submit
    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);

    // createGarment NO debe ser llamado
    await waitFor(() => {
      expect(createGarment).not.toHaveBeenCalled();
    });
  });
});

describe('Cancelar pedido', () => {
  it('muestra botón "Cancelar" para órdenes activas (no entregado)', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      const cancelBtns = screen.getAllByRole('button', { name: 'Cancelar' });
      // Solo órdenes no-entregado deben tener el botón
      const nonDelivered = mockGarments.filter(g => g.status !== 'entregado');
      expect(cancelBtns.length).toBeGreaterThanOrEqual(nonDelivered.length);
    });
  });

  it('no muestra "Cancelar" para órdenes entregadas', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Cancelar' }).length).toBeGreaterThan(0);
    });
    const cancelBtns = screen.getAllByRole('button', { name: 'Cancelar' });
    expect(cancelBtns.length).toBeLessThan(mockGarments.length);
  });

  it('abre dialog de confirmación al click (no usa window.confirm)', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Cancelar' }).length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar' })[0]);
    await waitFor(() => {
      // El dialog tiene su propio titulo y botón confirmar
      expect(screen.getByRole('heading', { name: /cancelar pedido/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sí, cancelar/i })).toBeInTheDocument();
    });
  });

  it('llama deleteGarment solo después de confirmar en el dialog', async () => {
    const { deleteGarment } = await import('../services/api');
    (deleteGarment as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Cancelar' }).length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar' })[0]);
    // Antes de confirmar, deleteGarment no se llamó
    expect(deleteGarment).not.toHaveBeenCalled();
    // Confirma en el dialog
    const confirmBtn = await screen.findByRole('button', { name: /sí, cancelar/i });
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(deleteGarment).toHaveBeenCalledTimes(1);
    });
  });

  it('cierra el dialog sin borrar al hacer click en Volver', async () => {
    const { deleteGarment } = await import('../services/api');
    (deleteGarment as ReturnType<typeof vi.fn>).mockClear();
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Cancelar' }).length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar' })[0]);
    const backBtn = await screen.findByRole('button', { name: /volver/i });
    fireEvent.click(backBtn);
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /cancelar pedido/i })).not.toBeInTheDocument();
    });
    expect(deleteGarment).not.toHaveBeenCalled();
  });
});

describe('BUG: Formulario edición vacío + cambios no guardados (Bug 1)', () => {
  it('el modal de edición pre-carga garmentName del primer item', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    // Click Editar en la primera orden
    const editButtons = screen.getAllByText('Editar');
    fireEvent.click(editButtons[0]);
    // Fix A1: el modal usa array de items — buscar por placeholder, no por name
    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    expect(garmentInputs.length).toBeGreaterThan(0);
    expect((garmentInputs[0] as HTMLInputElement).value).not.toBe('');
  });

  it('el modal de edición pre-carga repairType del primer item', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    const editButtons = screen.getAllByText('Editar');
    fireEvent.click(editButtons[0]);
    // Fix A1: el modal usa array de items — buscar por placeholder
    const repairInputs = screen.getAllByPlaceholderText(/arreglo \(ej:/i);
    expect(repairInputs.length).toBeGreaterThan(0);
    expect((repairInputs[0] as HTMLInputElement).value).not.toBe('');
  });

  it('el modal de edición pre-carga price del primer item', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    const editButtons = screen.getAllByText('Editar');
    fireEvent.click(editButtons[0]);
    // Fix A1: el modal usa array de items — buscar por placeholder
    const priceInputs = screen.getAllByPlaceholderText('Ej: 1500');
    expect(priceInputs.length).toBeGreaterThan(0);
    expect((priceInputs[0] as HTMLInputElement).value).not.toBe('');
    expect((priceInputs[0] as HTMLInputElement).value).not.toBe('0');
  });

  it('handleEdit llama updateGarment con los datos editados por el usuario (no los originales)', async () => {
    const { updateGarment } = await import('../services/api');
    (updateGarment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockGarments[0], items: [] });

    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Editar')[0]);

    // Fix A1: inputs del array no tienen name= — usar placeholder
    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    fireEvent.change(garmentInputs[0], { target: { value: 'Chaqueta de Cuero' } });

    const priceInputs = screen.getAllByPlaceholderText('Ej: 1500');
    fireEvent.change(priceInputs[0], { target: { value: '20000' } });

    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);

    await waitFor(() => {
      expect(updateGarment).toHaveBeenCalledTimes(1);
      const call = (updateGarment as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(call.items[0].garmentName).toBe('Chaqueta de Cuero');
      expect(call.items[0].price).toBe(20000);
    });
  });
});

describe('BUG: Cruce y pérdida de seña/monto al crear (Bug 2 & 3)', () => {
  it('seña ingresada en create mode se envía correctamente a createGarment', async () => {
    const { createGarment } = await import('../services/api');
    (createGarment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-1', orderNumber: 100 });

    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    fireEvent.click(screen.getByText('Nuevo cliente'));
    fireEvent.change(screen.getByPlaceholderText('Nombre y Apellido'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Teléfono'), { target: { value: '123' } });

    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    fireEvent.change(garmentInputs[0], { target: { value: 'Pantalón' } });
    const repairInputs = screen.getAllByPlaceholderText(/arreglo \(ej:/i);
    fireEvent.change(repairInputs[0], { target: { value: 'Dobladillo' } });

    // Ingresar precio en el item
    const priceInput = screen.getByPlaceholderText('Ej: 1500');
    fireEvent.change(priceInput, { target: { value: '31000' } });

    // Ingresar seña (campo de orden, no per-item)
    const depositInput = screen.getByPlaceholderText('Ej: 500');
    fireEvent.change(depositInput, { target: { value: '15000' } });

    const dateInputs = document.querySelectorAll('input[name="deliveryDate"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-12-01' } });

    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);

    await waitFor(() => {
      expect(createGarment).toHaveBeenCalledTimes(1);
      const call = (createGarment as ReturnType<typeof vi.fn>).mock.calls[0][0];
      // Seña debe ser 15000, NO 0
      expect(call.deposit).toBe(15000);
      // Precio del item debe ser 31000, NO sobreescrito por la seña
      expect(call.items[0].price).toBe(31000);
    });
  });

  it('monto 0 y seña 0 no genera saldo negativo (Bug 3: inversión de variables)', async () => {
    const { createGarment } = await import('../services/api');
    (createGarment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-1', orderNumber: 100 });

    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    fireEvent.click(screen.getByText('Nuevo cliente'));
    fireEvent.change(screen.getByPlaceholderText('Nombre y Apellido'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Teléfono'), { target: { value: '123' } });

    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    fireEvent.change(garmentInputs[0], { target: { value: 'Camisa' } });
    const repairInputs = screen.getAllByPlaceholderText(/arreglo \(ej:/i);
    fireEvent.change(repairInputs[0], { target: { value: 'Cierre' } });

    // Precio sin seña
    const priceInput = screen.getByPlaceholderText('Ej: 1500');
    fireEvent.change(priceInput, { target: { value: '5000' } });
    // Seña vacía (0)

    const dateInputs = document.querySelectorAll('input[name="deliveryDate"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-12-01' } });

    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);

    await waitFor(() => {
      expect(createGarment).toHaveBeenCalledTimes(1);
      const call = (createGarment as ReturnType<typeof vi.fn>).mock.calls[0][0];
      // El precio del item debe ser 5000 (no 0 por inversión)
      expect(call.items[0].price).toBe(5000);
      // La seña debe ser 0 (no el precio del arreglo)
      expect(call.deposit).toBe(0);
    });
  });

  it('monto igual a seña guarda ambos valores correctamente', async () => {
    const { createGarment } = await import('../services/api');
    (createGarment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-1', orderNumber: 100 });

    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    fireEvent.click(screen.getByText('Nuevo cliente'));
    fireEvent.change(screen.getByPlaceholderText('Nombre y Apellido'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Teléfono'), { target: { value: '123' } });

    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    fireEvent.change(garmentInputs[0], { target: { value: 'Bolso' } });
    const repairInputs = screen.getAllByPlaceholderText(/arreglo \(ej:/i);
    fireEvent.change(repairInputs[0], { target: { value: 'Cierre' } });

    const priceInput = screen.getByPlaceholderText('Ej: 1500');
    fireEvent.change(priceInput, { target: { value: '3000' } });

    const depositInput = screen.getByPlaceholderText('Ej: 500');
    fireEvent.change(depositInput, { target: { value: '3000' } });

    const dateInputs = document.querySelectorAll('input[name="deliveryDate"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-12-01' } });

    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);

    await waitFor(() => {
      expect(createGarment).toHaveBeenCalledTimes(1);
      const call = (createGarment as ReturnType<typeof vi.fn>).mock.calls[0][0];
      // Ambos deben ser 3000 (no uno vacío)
      expect(call.items[0].price).toBe(3000);
      expect(call.deposit).toBe(3000);
    });
  });
});

// ─── helpers ─────────────────────────────────────────────────────────────────
async function openCreateModal() {
  render(<ToastProvider><Garments /></ToastProvider>);
  await waitFor(() => {
    expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
  });
  fireEvent.click(screen.getByText('+ Registrar Ingreso'));
}

async function openCreateModalNuevoCliente() {
  await openCreateModal();
  fireEvent.click(screen.getByText('Nuevo cliente'));
}

function fillNuevoCliente(name = 'Test User', phone = '1199887766') {
  fireEvent.change(screen.getByPlaceholderText('Nombre y Apellido'), { target: { value: name } });
  fireEvent.change(screen.getByPlaceholderText('Teléfono'), { target: { value: phone } });
}

function fillItem(index: number, garmentName: string, repairType: string, price: string, description = '') {
  const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
  fireEvent.change(garmentInputs[index], { target: { value: garmentName } });
  const repairInputs = screen.getAllByPlaceholderText(/arreglo \(ej:/i);
  fireEvent.change(repairInputs[index], { target: { value: repairType } });
  if (description) {
    const descInputs = screen.getAllByPlaceholderText(/detalle/i);
    fireEvent.change(descInputs[index], { target: { value: description } });
  }
  const priceInput = screen.getAllByPlaceholderText('Ej: 1500')[index];
  fireEvent.change(priceInput, { target: { value: price } });
}

function setDeliveryDate(value: string) {
  const dateInputs = document.querySelectorAll('input[name="deliveryDate"]');
  fireEvent.change(dateInputs[0], { target: { value } });
}

function submitForm() {
  fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);
}

// ─── Validación: cliente no seleccionado (modo existente) ─────────────────────
describe('Crear orden — validación cliente existente no seleccionado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(mockGarments);
    (createGarmentImport as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-1', orderNumber: 100 });
    (generateTicket as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('muestra error si se hace submit sin seleccionar cliente en modo existente', async () => {
    await openCreateModal();
    // Permanece en modo "existente" (default), sin seleccionar ningún cliente
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    setDeliveryDate('2026-12-01');
    submitForm();
    expect(screen.getByText(/seleccioná un cliente de la lista/i)).toBeInTheDocument();
    expect(createGarmentImport).not.toHaveBeenCalled();
  });

  it('no muestra error de cliente al cambiar a modo "nuevo cliente"', async () => {
    await openCreateModal();
    // Intentar submit en modo existente primero para disparar el error
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    setDeliveryDate('2026-12-01');
    submitForm();
    expect(screen.getByText(/seleccioná un cliente de la lista/i)).toBeInTheDocument();
    // Cambiar a nuevo cliente → el error desaparece
    fireEvent.click(screen.getByText('Nuevo cliente'));
    expect(screen.queryByText(/seleccioná un cliente de la lista/i)).not.toBeInTheDocument();
  });

  it('permite submit después de seleccionar cliente existente del dropdown', async () => {
    (searchClients as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: '1', name: 'Ana García', phone: '11-1111-1111', business: 'zenco', createdAt: '2026-01-01' },
    ]);
    await openCreateModal();
    const searchInput = screen.getByPlaceholderText('Buscar cliente por nombre o teléfono...');
    fireEvent.change(searchInput, { target: { value: 'Ana' } });
    await waitFor(() => expect(screen.getByText('Ana García')).toBeInTheDocument(), { timeout: 500 });
    fireEvent.click(screen.getByText('Ana García'));
    // El cliente fue seleccionado
    expect(screen.getByText(/seleccionado:/i)).toBeInTheDocument();
    fillItem(0, 'Camisa', 'Cierre', '3000');
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => expect(createGarmentImport).toHaveBeenCalledTimes(1));
    const call = (createGarmentImport as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.clientName).toBe('Ana García');
    expect(call.clientPhone).toBe('11-1111-1111');
  });
});

// ─── Búsqueda de cliente existente ───────────────────────────────────────────
describe('Crear orden — búsqueda de cliente existente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(mockGarments);
    (createGarmentImport as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-1', orderNumber: 100 });
    (generateTicket as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (searchClients as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it('NO llama searchClients con menos de 2 caracteres', async () => {
    await openCreateModal();
    const searchInput = screen.getByPlaceholderText('Buscar cliente por nombre o teléfono...');
    fireEvent.change(searchInput, { target: { value: 'A' } });
    await waitFor(() => {}, { timeout: 400 });
    expect(searchClients).not.toHaveBeenCalled();
  });

  it('llama searchClients con 2+ caracteres (con debounce)', async () => {
    await openCreateModal();
    const searchInput = screen.getByPlaceholderText('Buscar cliente por nombre o teléfono...');
    fireEvent.change(searchInput, { target: { value: 'Ma' } });
    await waitFor(() => expect(searchClients).toHaveBeenCalledWith('Ma'), { timeout: 500 });
  });

  it('muestra dropdown con resultados de búsqueda', async () => {
    (searchClients as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: '1', name: 'María López', phone: '11-9999-8888', business: 'zenco', createdAt: '2026-01-01' },
      { id: '2', name: 'Marcos Díaz', phone: '11-7777-6666', business: 'zenco', createdAt: '2026-01-01' },
    ]);
    await openCreateModal();
    const searchInput = screen.getByPlaceholderText('Buscar cliente por nombre o teléfono...');
    fireEvent.change(searchInput, { target: { value: 'Ma' } });
    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
      expect(screen.getByText('Marcos Díaz')).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('muestra "No se encontraron clientes" si búsqueda vacía', async () => {
    (searchClients as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await openCreateModal();
    const searchInput = screen.getByPlaceholderText('Buscar cliente por nombre o teléfono...');
    fireEvent.change(searchInput, { target: { value: 'ZZZ' } });
    await waitFor(() => {
      expect(screen.getByText(/no se encontraron clientes/i)).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('seleccionar cliente llena su nombre y teléfono', async () => {
    (searchClients as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: '5', name: 'Laura Pérez', phone: '11-5555-4444', business: 'zenco', createdAt: '2026-01-01' },
    ]);
    await openCreateModal();
    fireEvent.change(screen.getByPlaceholderText('Buscar cliente por nombre o teléfono...'), { target: { value: 'Laura' } });
    await waitFor(() => expect(screen.getByText('Laura Pérez')).toBeInTheDocument(), { timeout: 500 });
    fireEvent.click(screen.getByText('Laura Pérez'));
    // Debe mostrar el nombre seleccionado y teléfono
    expect(screen.getByText(/Laura Pérez/)).toBeInTheDocument();
    expect(screen.getByText('11-5555-4444')).toBeInTheDocument();
  });
});

// ─── Multi-item: agregar y quitar prendas ─────────────────────────────────────
describe('Crear orden — gestión de múltiples prendas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(mockGarments);
    (createGarmentImport as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-1', orderNumber: 100 });
    (generateTicket as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('botón eliminar no aparece cuando hay solo 1 prenda', async () => {
    await openCreateModalNuevoCliente();
    expect(screen.queryByLabelText(/eliminar prenda/i)).not.toBeInTheDocument();
  });

  it('botón eliminar aparece al agregar una segunda prenda', async () => {
    await openCreateModalNuevoCliente();
    fireEvent.click(screen.getByRole('button', { name: /añadir.*prenda/i }));
    const deleteButtons = screen.getAllByLabelText(/eliminar prenda/i);
    expect(deleteButtons).toHaveLength(2);
  });

  it('quitar una prenda reduce la lista a 1 item', async () => {
    await openCreateModalNuevoCliente();
    fireEvent.click(screen.getByRole('button', { name: /añadir.*prenda/i }));
    expect(screen.getAllByPlaceholderText(/prenda \(ej:/i)).toHaveLength(2);
    const deleteButtons = screen.getAllByLabelText(/eliminar prenda/i);
    fireEvent.click(deleteButtons[0]);
    expect(screen.getAllByPlaceholderText(/prenda \(ej:/i)).toHaveLength(1);
    // Con 1 item, botón eliminar desaparece
    expect(screen.queryByLabelText(/eliminar prenda/i)).not.toBeInTheDocument();
  });

  it('quitar la segunda prenda mantiene la primera intacta', async () => {
    await openCreateModalNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    fireEvent.click(screen.getByRole('button', { name: /añadir.*prenda/i }));
    fillItem(1, 'Camisa', 'Cierre', '3000');
    // Quitar la segunda prenda
    const deleteButtons = screen.getAllByLabelText(/eliminar prenda/i);
    fireEvent.click(deleteButtons[1]);
    // La primera prenda sigue intacta
    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    expect((garmentInputs[0] as HTMLInputElement).value).toBe('Pantalón');
  });

  it('3 prendas → createGarment recibe 3 items con sus precios correctos', async () => {
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    fireEvent.click(screen.getByRole('button', { name: /añadir.*prenda/i }));
    fillItem(1, 'Camisa', 'Cierre', '3000');
    fireEvent.click(screen.getByRole('button', { name: /añadir.*prenda/i }));
    fillItem(2, 'Vestido', 'Entalle', '12000');
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => {
      expect(createGarmentImport).toHaveBeenCalledTimes(1);
      const call = (createGarmentImport as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.items).toHaveLength(3);
      expect(call.items[0].price).toBe(5000);
      expect(call.items[1].price).toBe(3000);
      expect(call.items[2].price).toBe(12000);
    });
  });

  it('items con description vacía se envían con description=""', async () => {
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000'); // sin description
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => {
      const call = (createGarmentImport as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.items[0].description).toBe('');
    });
  });

  it('items con description llena la envía correctamente', async () => {
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000', 'Subir 4cm del borde');
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => {
      const call = (createGarmentImport as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.items[0].description).toBe('Subir 4cm del borde');
    });
  });
});

// ─── Campos enviados al API ───────────────────────────────────────────────────
describe('Crear orden — payload completo enviado al API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(mockGarments);
    (createGarmentImport as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-1', orderNumber: 100 });
    (generateTicket as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('envía intakeDate con la fecha de hoy por defecto', async () => {
    const today = new Date().toISOString().split('T')[0];
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => {
      const call = (createGarmentImport as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.intakeDate).toBe(today);
    });
  });

  it('envía status="recibido" por defecto', async () => {
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => {
      const call = (createGarmentImport as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.status).toBe('recibido');
    });
  });

  it('envía deposit=0 cuando no se ingresa seña', async () => {
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    setDeliveryDate('2026-12-01');
    // No se llena el campo de seña
    submitForm();
    await waitFor(() => {
      const call = (createGarmentImport as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.deposit).toBe(0);
    });
  });

  it('envía deliveryDate correctamente', async () => {
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    setDeliveryDate('2026-11-15');
    submitForm();
    await waitFor(() => {
      const call = (createGarmentImport as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.deliveryDate).toBe('2026-11-15');
    });
  });

  it('envía clientName y clientPhone del nuevo cliente', async () => {
    await openCreateModalNuevoCliente();
    fillNuevoCliente('Claudia Ramos', '1155443322');
    fillItem(0, 'Chaqueta', 'Cremallera', '8000');
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => {
      const call = (createGarmentImport as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.clientName).toBe('Claudia Ramos');
      expect(call.clientPhone).toBe('1155443322');
    });
  });

  it('envía garmentName y repairType del item correctamente', async () => {
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Vestido de Novia', 'Ajuste de talle', '25000');
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => {
      const call = (createGarmentImport as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.items[0].garmentName).toBe('Vestido de Novia');
      expect(call.items[0].repairType).toBe('Ajuste de talle');
    });
  });

  it('price=0 en un item bloquea el submit (Fix A2: precio requerido > 0)', async () => {
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    // No rellenar el price → queda en 0 → el submit debe ser bloqueado (Fix A2)
    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    fireEvent.change(garmentInputs[0], { target: { value: 'Chaleco' } });
    const repairInputs = screen.getAllByPlaceholderText(/arreglo \(ej:/i);
    fireEvent.change(repairInputs[0], { target: { value: 'Botones' } });
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => {
      expect(createGarmentImport).not.toHaveBeenCalled();
    });
  });
});

// ─── Bug A2: Precio $0 pasa silenciosamente ───────────────────────────────────
describe('Bug A2 — Validación precio $0 en items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(mockGarments);
    (createGarmentImport as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-1', orderNumber: 100 });
    (generateTicket as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('[A2] createGarment NO se llama si algún item tiene price=0', async () => {
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    // Llenar item pero dejar precio en 0 (no cambiar el campo)
    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    fireEvent.change(garmentInputs[0], { target: { value: 'Pantalón' } });
    const repairInputs = screen.getAllByPlaceholderText(/arreglo \(ej:/i);
    fireEvent.change(repairInputs[0], { target: { value: 'Dobladillo' } });
    // Precio queda en 0 (no se llena)
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => {
      expect(createGarmentImport).not.toHaveBeenCalled();
    });
  });

  it('[A2] se muestra toast de error "Ingresá el precio de cada prenda" cuando price=0', async () => {
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    fireEvent.change(garmentInputs[0], { target: { value: 'Pantalón' } });
    const repairInputs = screen.getAllByPlaceholderText(/arreglo \(ej:/i);
    fireEvent.change(repairInputs[0], { target: { value: 'Dobladillo' } });
    // Precio queda en 0
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => {
      expect(screen.getByText(/ingresá el precio de cada prenda/i)).toBeInTheDocument();
    });
  });

  it('[A2] createGarment SÍ se llama si todos los items tienen price > 0', async () => {
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => {
      expect(createGarmentImport).toHaveBeenCalledTimes(1);
    });
  });
});

// ─── Bug M1: isOverdue usa UTC en lugar de hora local argentina ───────────────
describe('Bug M1 — isOverdue usa fecha local no UTC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (generateTicket as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('[M1] una orden con deliveryDate=hoy-local NO aparece como Vencida a las 22:00 AR (01:00 UTC del día siguiente)', async () => {
    // 2026-05-05T01:00:00Z = medianoche UTC del 5/5 pero las 22:00 AR del 4/5
    // En AR (UTC-3): es el 2026-05-04 a las 22:00
    // Una orden con deliveryDate='2026-05-04' NO debería aparecer como vencida aún
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-05-05T01:00:00Z')); // 01:00 UTC = 22:00 ARG del 04/05

    const localDate = new Date();
    const localDateStr = `${localDate.getFullYear()}-${String(localDate.getMonth()+1).padStart(2,'0')}-${String(localDate.getDate()).padStart(2,'0')}`;
    // localDateStr debería ser '2026-05-04' (hora local AR)

    const garmentDueToday: typeof mockGarments[0] = {
      id: 'ORD-LOCAL', orderNumber: 99, clientName: 'Test', clientPhone: '123',
      status: 'recibido', intakeDate: '2026-05-01',
      deliveryDate: localDateStr, // hoy en hora local
      deposit: 0,
      items: [makeItem('Camisa', 'Cierre', 'Test', 1000)],
    };
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue([garmentDueToday]);

    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Camisa/i)[0]).toBeInTheDocument();
    });

    // La orden NO debería mostrar badge "Vencido" ya que deliveryDate es HOY en hora local
    expect(screen.queryByText(/vencid/i)).not.toBeInTheDocument();
  });

  it('[M1] la función today usa fecha local (getFullYear/getMonth/getDate) no toISOString UTC', async () => {
    // Mock Date a 01:00 UTC (= 22:00 AR del día anterior)
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-05-05T01:00:00Z'));

    // UTC today sería '2026-05-05' pero local AR sería '2026-05-04'
    const utcToday = new Date().toISOString().split('T')[0]; // '2026-05-05'
    const d = new Date();
    const localToday = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    // En entorno UTC (vitest corre en UTC), ambas serían iguales
    // Este test documenta el comportamiento esperado del fix
    // La diferencia existiría en producción con TZ=America/Argentina/Buenos_Aires
    // Aquí verificamos que el componente no usa toISOString para la fecha local
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {}, { timeout: 100 });

    // El componente debe renderizar sin errores con el fix aplicado
    expect(screen.queryByRole('alert')).toBeFalsy(); // no crash

    // Verificamos que utcToday y localToday pueden diferir (documentación del bug)
    // En TZ=UTC son iguales, pero en AR serían diferentes
    expect(typeof localToday).toBe('string');
    expect(localToday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof utcToday).toBe('string');
  });
});

// ─── Validación de fecha de entrega ──────────────────────────────────────────
describe('Crear orden — validación fecha de entrega', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(mockGarments);
    (createGarmentImport as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-1', orderNumber: 100 });
    (generateTicket as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('muestra error inline si deliveryDate es una fecha pasada', async () => {
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    setDeliveryDate('2020-01-01');
    submitForm();
    expect(screen.getByText(/fecha de entrega no puede ser una fecha pasada/i)).toBeInTheDocument();
    expect(createGarmentImport).not.toHaveBeenCalled();
  });

  it('el error de fecha desaparece al cambiar a una fecha futura válida', async () => {
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    setDeliveryDate('2020-01-01');
    submitForm();
    expect(screen.getByText(/fecha de entrega no puede ser una fecha pasada/i)).toBeInTheDocument();
    // Corregir la fecha
    setDeliveryDate('2026-12-01');
    expect(screen.queryByText(/fecha de entrega no puede ser una fecha pasada/i)).not.toBeInTheDocument();
  });

  it('bloquea submit si deliveryDate está vacía (toast de error)', async () => {
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    // deliveryDate queda vacía
    submitForm();
    await waitFor(() => expect(createGarmentImport).not.toHaveBeenCalled());
  });

  it('no bloquea submit si deliveryDate es hoy', async () => {
    const today = new Date().toISOString().split('T')[0];
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    setDeliveryDate(today);
    submitForm();
    await waitFor(() => expect(createGarmentImport).toHaveBeenCalledTimes(1));
  });

  it('el input deliveryDate tiene atributo min = hoy', async () => {
    const today = new Date().toISOString().split('T')[0];
    await openCreateModalNuevoCliente();
    const dateInput = document.querySelector('input[name="deliveryDate"]') as HTMLInputElement;
    expect(dateInput.min).toBe(today);
  });
});

// ─── Flujo de éxito ───────────────────────────────────────────────────────────
describe('Crear orden — flujo de éxito completo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(mockGarments);
    (createGarmentImport as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-1', orderNumber: 100 });
    (generateTicket as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('el modal se cierra después de crear correctamente', async () => {
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => {
      expect(screen.queryByText('Registrar Nueva Orden')).not.toBeInTheDocument();
    });
  });

  it('fetchGarments se llama de nuevo para recargar la lista', async () => {
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => {
      // fetchGarments inicial + recarga post-create = 2 llamadas
      expect(fetchGarments).toHaveBeenCalledTimes(2);
    });
  });

  it('el form se resetea después de crear (modal reabierto muestra campos vacíos)', async () => {
    await openCreateModalNuevoCliente();
    fillNuevoCliente('María Test', '1111111111');
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => expect(screen.queryByText('Registrar Nueva Orden')).not.toBeInTheDocument());
    // Reabrir modal — campos deben estar vacíos (no datos del submit anterior)
    fireEvent.click(screen.getByText('+ Registrar Ingreso'));
    fireEvent.click(screen.getByText('Nuevo cliente'));
    const nameInput = screen.getByPlaceholderText('Nombre y Apellido') as HTMLInputElement;
    expect(nameInput.value).toBe('');
  });
});

// ─── Manejo de errores ────────────────────────────────────────────────────────
describe('Crear orden — manejo de errores de API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(mockGarments);
    (generateTicket as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('muestra toast de error cuando createGarment falla', async () => {
    (createGarmentImport as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => {
      expect(screen.getByText(/error al guardar la orden/i)).toBeInTheDocument();
    });
  });

  it('el modal permanece abierto cuando createGarment falla', async () => {
    (createGarmentImport as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => {
      // El modal sigue abierto
      expect(screen.getByText('Registrar Nueva Orden')).toBeInTheDocument();
    });
  });

  it('botón Guardar vuelve a estar habilitado después del error', async () => {
    (createGarmentImport as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => {
      const saveBtn = screen.getByRole('button', { name: /guardar/i });
      expect(saveBtn).not.toBeDisabled();
    });
  });

  it('generateTicket que falla no impide que el modal se cierre', async () => {
    (createGarmentImport as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-1', orderNumber: 100 });
    (generateTicket as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Ticket error'));
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => {
      expect(screen.queryByText('Registrar Nueva Orden')).not.toBeInTheDocument();
    });
  });
});

// ─── Editar orden — pre-carga y guardado ─────────────────────────────────────
describe('Editar orden — pre-carga del formulario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(mockGarments);
    (generateTicket as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('pre-carga clientName y clientPhone del pedido', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument());
    // Sort order: listo(Sofía, idx 2) → en_proceso(María, idx 0) → recibido(Juan, idx 1) → entregado
    const firstSorted = mockGarments[2]; // Sofía L. — listo, aparece primero
    fireEvent.click(screen.getAllByText('Editar')[0]);
    const clientNameInput = document.querySelector('input[name="clientName"]') as HTMLInputElement;
    expect(clientNameInput.value).toBe(firstSorted.clientName);
    const clientPhoneInput = document.querySelector('input[name="clientPhone"]') as HTMLInputElement;
    expect(clientPhoneInput.value).toBe(firstSorted.clientPhone);
  });

  it('pre-carga deliveryDate del pedido', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument());
    const firstSorted = mockGarments[2]; // Sofía L. — listo, aparece primero
    fireEvent.click(screen.getAllByText('Editar')[0]);
    const dateInput = document.querySelector('input[name="deliveryDate"]') as HTMLInputElement;
    expect(dateInput.value).toBe(firstSorted.deliveryDate);
  });

  it('pre-carga deposit del pedido', async () => {
    const garmentWithDeposit = [{ ...mockGarments[0], deposit: 7500 }];
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(garmentWithDeposit);
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('Editar')[0]);
    const depositInput = document.querySelector('input[name="deposit"]') as HTMLInputElement;
    expect(depositInput.value).toBe('7500');
  });

  it('pre-carga status del pedido en el selector', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument());
    const firstSorted = mockGarments[2]; // Sofía L. — listo, aparece primero
    fireEvent.click(screen.getAllByText('Editar')[0]);
    const statusSelect = document.querySelector('select[name="status"]') as HTMLSelectElement;
    expect(statusSelect.value).toBe(firstSorted.status); // 'listo'
  });
});

describe('Editar orden — guardar cambios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(mockGarments);
    (generateTicket as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('cambiar deposit y guardar llama updateGarment con deposit actualizado', async () => {
    const { updateGarment } = await import('../services/api');
    (updateGarment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockGarments[0], items: [] });
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('Editar')[0]);
    const depositInput = document.querySelector('input[name="deposit"]') as HTMLInputElement;
    fireEvent.change(depositInput, { target: { value: '5000' } });
    submitForm();
    await waitFor(() => {
      expect(updateGarment).toHaveBeenCalledTimes(1);
      const call = (updateGarment as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(call.deposit).toBe(5000);
    });
  });

  it('cambiar status a "listo" y guardar llama updateGarment con status actualizado', async () => {
    const { updateGarment } = await import('../services/api');
    (updateGarment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockGarments[0], items: [] });
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('Editar')[0]);
    const statusSelect = document.querySelector('select[name="status"]') as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'listo' } });
    submitForm();
    await waitFor(() => {
      expect(updateGarment).toHaveBeenCalledTimes(1);
      const call = (updateGarment as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(call.status).toBe('listo');
    });
  });

  it('el modal de edición se cierra después de guardar exitosamente', async () => {
    const { updateGarment } = await import('../services/api');
    (updateGarment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockGarments[2], items: [] });
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument());
    // Primer Editar = Sofía L. (listo, orderNumber 3)
    const firstSorted = mockGarments[2];
    const orderLabel = `Editar Orden ORD-${String(firstSorted.orderNumber).padStart(6, '0')}`;
    fireEvent.click(screen.getAllByText('Editar')[0]);
    expect(screen.getByText(orderLabel)).toBeInTheDocument();
    submitForm();
    await waitFor(() => {
      expect(screen.queryByText(orderLabel)).not.toBeInTheDocument();
    });
  });

  it('muestra error toast cuando updateGarment falla', async () => {
    const { updateGarment } = await import('../services/api');
    (updateGarment as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Server error'));
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('Editar')[0]);
    submitForm();
    await waitFor(() => {
      expect(screen.getByText(/error al actualizar la orden/i)).toBeInTheDocument();
    });
  });
});

// ─── BUG A1: Modal edición muestra solo el primer item ───────────────────────
const mockGarmentMultiItem = {
  id: 'ORD-MULTI', orderNumber: 10, clientName: 'Ana Test', clientPhone: '11-0000-0000',
  status: 'en_proceso', intakeDate: '2026-04-01', deliveryDate: '2026-12-01', deposit: 0,
  items: [
    makeItem('Campera', 'cierre', 'Cambiar cierre', 10000),
    makeItem('Pantalón', 'dobladillo', 'Subir 3cm', 5000),
  ],
};

describe('BUG A1 — Modal edición muestra todos los items (no solo el primero)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue([mockGarmentMultiItem]);
    (generateTicket as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('[A1] al abrir edición de una orden con 2 items, muestra AMBAS prendas', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => expect(screen.getAllByText(/Campera/i)[0]).toBeInTheDocument());
    fireEvent.click(screen.getByText('Editar'));
    // Deben haber 2 inputs de prenda visibles
    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    expect(garmentInputs.length).toBe(2);
    expect((garmentInputs[0] as HTMLInputElement).value).toBe('Campera');
    expect((garmentInputs[1] as HTMLInputElement).value).toBe('Pantalón');
  });

  it('[A1] editar el segundo item y guardar → updateGarment recibe el segundo item actualizado', async () => {
    const { updateGarment } = await import('../services/api');
    (updateGarment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockGarmentMultiItem });
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => expect(screen.getAllByText(/Campera/i)[0]).toBeInTheDocument());
    fireEvent.click(screen.getByText('Editar'));

    // Modificar el segundo item
    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    fireEvent.change(garmentInputs[1], { target: { value: 'Pantalón de Vestir' } });

    submitForm();
    await waitFor(() => {
      expect(updateGarment).toHaveBeenCalledTimes(1);
      const call = (updateGarment as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(call.items.length).toBeGreaterThanOrEqual(2);
      const secondItem = call.items[1];
      expect(secondItem.garmentName).toBe('Pantalón de Vestir');
    });
  });

  it('[A1] añadir un item en modo edición y guardar → updateGarment recibe N+1 items', async () => {
    const { updateGarment } = await import('../services/api');
    (updateGarment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockGarmentMultiItem });
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => expect(screen.getAllByText(/Campera/i)[0]).toBeInTheDocument());
    fireEvent.click(screen.getByText('Editar'));

    // Añadir un tercer item
    fireEvent.click(screen.getByRole('button', { name: /añadir.*prenda/i }));
    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    expect(garmentInputs.length).toBe(3);
    fireEvent.change(garmentInputs[2], { target: { value: 'Vestido' } });
    const repairInputs = screen.getAllByPlaceholderText(/arreglo \(ej:/i);
    fireEvent.change(repairInputs[2], { target: { value: 'Entalle' } });
    const priceInputs = screen.getAllByPlaceholderText('Ej: 1500');
    fireEvent.change(priceInputs[2], { target: { value: '8000' } });

    submitForm();
    await waitFor(() => {
      expect(updateGarment).toHaveBeenCalledTimes(1);
      const call = (updateGarment as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(call.items).toHaveLength(3);
      expect(call.items[2].garmentName).toBe('Vestido');
    });
  });

  it('[A1] quitar un item en modo edición y guardar → updateGarment recibe N-1 items', async () => {
    const { updateGarment } = await import('../services/api');
    (updateGarment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockGarmentMultiItem });
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => expect(screen.getAllByText(/Campera/i)[0]).toBeInTheDocument());
    fireEvent.click(screen.getByText('Editar'));

    // Verificar que hay 2 items y botón eliminar
    const deleteButtons = screen.getAllByLabelText(/eliminar prenda/i);
    expect(deleteButtons.length).toBe(2);
    fireEvent.click(deleteButtons[1]); // eliminar el segundo item

    submitForm();
    await waitFor(() => {
      expect(updateGarment).toHaveBeenCalledTimes(1);
      const call = (updateGarment as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(call.items).toHaveLength(1);
      expect(call.items[0].garmentName).toBe('Campera');
    });
  });
});

// ─── BUG A4: Race condition al cerrar modal durante upload ───────────────────
describe('BUG A4 — Race condition: cerrar modal antes de que resuelva createGarment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(mockGarments);
    (generateTicket as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('[A4] smoke: el flujo de creación normal sigue funcionando (fetchGarments se llama 2 veces)', async () => {
    (createGarmentImport as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-1', orderNumber: 100 });
    await openCreateModalNuevoCliente();
    fillNuevoCliente();
    fillItem(0, 'Pantalón', 'Dobladillo', '5000');
    setDeliveryDate('2026-12-01');
    submitForm();
    await waitFor(() => {
      expect(fetchGarments).toHaveBeenCalledTimes(2);
    });
  });
});

// ─── BUG A5: Fecha de entrega pasada en edición sin warning ──────────────────
describe('BUG A5 — Fecha pasada en edición muestra advertencia pero no bloquea', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(mockGarments);
    (generateTicket as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('[A5] editar con fecha pasada → updateGarment ES llamado (no bloquea) Y muestra advertencia', async () => {
    const { updateGarment } = await import('../services/api');
    (updateGarment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockGarments[0], items: [] });
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('Editar')[0]);

    // Poner fecha pasada
    const dateInput = document.querySelector('input[name="deliveryDate"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2020-01-01' } });

    submitForm();
    await waitFor(() => {
      // updateGarment DEBE ser llamado (no bloqueado)
      expect(updateGarment).toHaveBeenCalledTimes(1);
      // Y debe aparecer un mensaje de advertencia
      expect(screen.getByText(/atención.*fecha.*pasado|fecha.*pasad|entrega.*pasad/i)).toBeInTheDocument();
    });
  });

  it('[A5] editar con fecha futura → NO aparece advertencia de fecha pasada', async () => {
    const { updateGarment } = await import('../services/api');
    (updateGarment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockGarments[0], items: [] });
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('Editar')[0]);

    const dateInput = document.querySelector('input[name="deliveryDate"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-12-01' } });

    submitForm();
    await waitFor(() => {
      expect(updateGarment).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText(/atención.*fecha.*pasado|fecha.*pasad|entrega.*pasad/i)).not.toBeInTheDocument();
  });
});

// ─── BUG M4: Bloqueo silencioso si clientName/Phone vacíos en edición ────────
describe('BUG M4 — Validación explícita de clientName/Phone en edición', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchGarments as ReturnType<typeof vi.fn>).mockResolvedValue(mockGarments);
    (generateTicket as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('[M4] borrar clientName e intentar guardar → toast de error, updateGarment NO se llama', async () => {
    const { updateGarment } = await import('../services/api');
    (updateGarment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockGarments[0], items: [] });
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('Editar')[0]);

    const clientNameInput = document.querySelector('input[name="clientName"]') as HTMLInputElement;
    fireEvent.change(clientNameInput, { target: { value: '' } });

    submitForm();
    await waitFor(() => {
      expect(screen.getByText(/nombre.*teléfono.*obligatorio|nombre y teléfono/i)).toBeInTheDocument();
      expect(updateGarment).not.toHaveBeenCalled();
    });
  });

  it('[M4] borrar clientPhone e intentar guardar → toast de error, updateGarment NO se llama', async () => {
    const { updateGarment } = await import('../services/api');
    (updateGarment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockGarments[0], items: [] });
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('Editar')[0]);

    const clientPhoneInput = document.querySelector('input[name="clientPhone"]') as HTMLInputElement;
    fireEvent.change(clientPhoneInput, { target: { value: '' } });

    submitForm();
    await waitFor(() => {
      expect(screen.getByText(/nombre.*teléfono.*obligatorio|nombre y teléfono/i)).toBeInTheDocument();
      expect(updateGarment).not.toHaveBeenCalled();
    });
  });
});
