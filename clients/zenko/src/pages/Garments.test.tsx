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
    // Form contains Guardar and Cancelar buttons
    expect(screen.getByText('Guardar')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
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
    expect(link).toHaveAttribute('href', expect.stringContaining('wa.me'));
    expect(link).toHaveAttribute('target', '_blank');
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

    // Añadir segunda prenda
    fireEvent.click(screen.getByRole('button', { name: /añadir.*prenda/i }));

    // Rellenar la segunda prenda
    const garmentInputs2 = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    fireEvent.change(garmentInputs2[1], { target: { value: 'Camisa' } });
    const repairInputs2 = screen.getAllByPlaceholderText(/arreglo \(ej:/i);
    fireEvent.change(repairInputs2[1], { target: { value: 'Cierre' } });
    const descInputs2 = screen.getAllByPlaceholderText(/detalle/i);
    fireEvent.change(descInputs2[1], { target: { value: 'Cambiar cierre' } });

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
  it('muestra botón "Cancelar pedido" para órdenes activas (no entregado)', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      const cancelBtns = screen.getAllByText('Cancelar pedido');
      // Solo órdenes no-entregado deben tener el botón
      const nonDelivered = mockGarments.filter(g => g.status !== 'entregado');
      expect(cancelBtns.length).toBeGreaterThanOrEqual(nonDelivered.length);
    });
  });

  it('no muestra "Cancelar pedido" para órdenes entregadas', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText('Cancelar pedido').length).toBeGreaterThan(0);
    });
    // Hay menos botones Cancelar que órdenes totales (porque la entregada no tiene)
    const cancelBtns = screen.getAllByText('Cancelar pedido');
    expect(cancelBtns.length).toBeLessThan(mockGarments.length);
  });

  it('llama deleteGarment al confirmar cancelación', async () => {
    const { deleteGarment } = await import('../services/api');
    (deleteGarment as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    window.confirm = vi.fn(() => true);
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText('Cancelar pedido').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByText('Cancelar pedido')[0]);
    await waitFor(() => {
      expect(deleteGarment).toHaveBeenCalledTimes(1);
    });
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
    // El campo garmentName debe tener el valor del primer item (no vacío)
    const garmentInput = document.querySelector('input[name="garmentName"]') as HTMLInputElement;
    expect(garmentInput).not.toBeNull();
    expect(garmentInput.value).not.toBe('');
  });

  it('el modal de edición pre-carga repairType del primer item', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    const editButtons = screen.getAllByText('Editar');
    fireEvent.click(editButtons[0]);
    const repairInput = document.querySelector('input[name="repairType"]') as HTMLInputElement;
    expect(repairInput).not.toBeNull();
    expect(repairInput.value).not.toBe('');
  });

  it('el modal de edición pre-carga price del primer item', async () => {
    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });
    const editButtons = screen.getAllByText('Editar');
    fireEvent.click(editButtons[0]);
    const priceInput = document.querySelector('input[name="price"]') as HTMLInputElement;
    expect(priceInput).not.toBeNull();
    expect(priceInput.value).not.toBe('');
    expect(priceInput.value).not.toBe('0');
  });

  it('handleEdit llama updateGarment con los datos editados por el usuario (no los originales)', async () => {
    const { updateGarment } = await import('../services/api');
    (updateGarment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockGarments[0], items: [] });

    render(<ToastProvider><Garments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getAllByText(/Campera de Cuero/i)[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Editar')[0]);

    // Cambiar garmentName
    const garmentInput = document.querySelector('input[name="garmentName"]') as HTMLInputElement;
    fireEvent.change(garmentInput, { target: { value: 'Chaqueta de Cuero' } });

    // Cambiar price
    const priceInput = document.querySelector('input[name="price"]') as HTMLInputElement;
    fireEvent.change(priceInput, { target: { value: '20000' } });

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
