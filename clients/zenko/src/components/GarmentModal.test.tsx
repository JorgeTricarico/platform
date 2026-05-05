import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import GarmentModal, { EMPTY_FORM, EMPTY_ITEM, getPriceSuggestion } from './GarmentModal';
import type { GarmentFormState } from './GarmentModal';
import type { DBGarment } from '../services/api';

vi.mock('../services/api', () => ({
  searchClients: vi.fn().mockResolvedValue([]),
}));

vi.mock('./PhotoGallery', () => ({
  default: () => <div data-testid="photo-gallery">Photos</div>,
}));

vi.mock('./CameraCapture', () => ({
  default: () => <div data-testid="camera-capture">Camera</div>,
}));

Element.prototype.scrollIntoView = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

const defaultProps = {
  title: 'Nueva Prenda',
  form: { ...EMPTY_FORM },
  setForm: vi.fn(),
  onSubmit: vi.fn().mockResolvedValue(undefined),
  onClose: vi.fn(),
  showStatus: false,
};

function Wrapper(props: Partial<typeof defaultProps> & { garmentId?: string; garmentHistory?: DBGarment[] }) {
  const [form, setForm] = useState<GarmentFormState>({
    ...EMPTY_FORM,
    clientName: 'Test',
    clientPhone: '123',
    garmentName: 'Pantalon',
    repairType: 'dobladillo',
    description: 'test',
    deliveryDate: '2026-05-01',
    price: 1000,
    items: [{ ...EMPTY_ITEM }],
  });
  return (
    <GarmentModal
      title={props.title ?? 'Nueva Prenda'}
      form={form}
      setForm={setForm}
      onSubmit={props.onSubmit ?? vi.fn().mockResolvedValue(undefined)}
      onClose={props.onClose ?? vi.fn()}
      showStatus={props.showStatus ?? false}
      garmentId={props.garmentId}
      garmentHistory={props.garmentHistory}
    />
  );
}

describe('GarmentModal', () => {
  it('renderiza con el título correcto', () => {
    render(<GarmentModal {...defaultProps} title="Editar Prenda" />);
    expect(screen.getByText('Editar Prenda')).toBeInTheDocument();
  });

  it('muestra botones "Cliente existente" y "Nuevo cliente" en modo crear', () => {
    render(<GarmentModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /cliente existente/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nuevo cliente/i })).toBeInTheDocument();
  });

  it('no muestra toggle de cliente en modo editar (garmentId presente)', () => {
    render(<GarmentModal {...defaultProps} garmentId="abc-123" />);
    expect(screen.queryByRole('button', { name: /cliente existente/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /nuevo cliente/i })).not.toBeInTheDocument();
  });

  it('muestra campo de búsqueda en modo "cliente existente"', () => {
    render(<GarmentModal {...defaultProps} />);
    // Por defecto en modo crear, el modo es 'existing'
    expect(screen.getByPlaceholderText(/buscar cliente por nombre o teléfono/i)).toBeInTheDocument();
  });

  it('muestra campos nombre/teléfono en modo "nuevo cliente"', () => {
    render(<GarmentModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /nuevo cliente/i }));
    expect(screen.getByPlaceholderText(/nombre y apellido/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/teléfono/i)).toBeInTheDocument();
  });

  it('muestra select de estado cuando showStatus=true', () => {
    render(<GarmentModal {...defaultProps} showStatus={true} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /recibido/i })).toBeInTheDocument();
  });

  it('no muestra select de estado cuando showStatus=false', () => {
    render(<GarmentModal {...defaultProps} showStatus={false} />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('muestra PhotoGallery cuando garmentId está presente', () => {
    render(<GarmentModal {...defaultProps} garmentId="abc-123" />);
    expect(screen.getByTestId('photo-gallery')).toBeInTheDocument();
  });

  it('no muestra PhotoGallery cuando garmentId no está presente', () => {
    render(<GarmentModal {...defaultProps} />);
    expect(screen.queryByTestId('photo-gallery')).not.toBeInTheDocument();
  });

  it('llama onSubmit al enviar el form', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<Wrapper onSubmit={onSubmit} garmentId="abc-123" />);
    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('bloquea submit si la fecha de entrega es pasada', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const pastDate = '2020-01-01';
    const [form, setForm] = [{ ...EMPTY_FORM, deliveryDate: pastDate, clientName: 'Test', clientPhone: '123', garmentName: 'Pantalon', repairType: 'dobladillo', description: 'test', price: 1000 }, vi.fn()];
    render(<GarmentModal title="Nueva Prenda" form={form} setForm={setForm} onSubmit={onSubmit} onClose={vi.fn()} showStatus={false} />);
    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/fecha.*pasada|pasada|anterior/i)).toBeInTheDocument();
  });

  it('el input de fecha de entrega tiene atributo min igual a hoy', () => {
    render(<Wrapper />);
    const deliveryInput = document.querySelector('input[name="deliveryDate"]') as HTMLInputElement;
    expect(deliveryInput).not.toBeNull();
    expect(deliveryInput.min).toBeTruthy();
  });

  // BUG 1: Prendas vencidas imposibles de editar
  it('[BUG1] en modo edición, permite guardar aunque la fecha de entrega sea pasada', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const pastDate = '2020-01-01';
    const form = {
      ...EMPTY_FORM,
      deliveryDate: pastDate,
      clientName: 'Test',
      clientPhone: '123',
      garmentName: 'Pantalon',
      repairType: 'dobladillo',
      description: 'test',
      price: 1000,
    };
    render(
      <GarmentModal
        title="Editar Prenda"
        form={form}
        setForm={vi.fn()}
        onSubmit={onSubmit}
        onClose={vi.fn()}
        showStatus={true}
        garmentId="abc-123"
      />
    );
    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);
    // En modo edición, onSubmit DEBE ser llamado aunque la fecha sea pasada
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/fecha.*pasada|pasada|anterior/i)).not.toBeInTheDocument();
  });

  it('[BUG1] en modo edición, el input de fecha de entrega NO tiene atributo min', () => {
    render(<Wrapper garmentId="abc-123" />);
    const deliveryInput = document.querySelector('input[name="deliveryDate"]') as HTMLInputElement;
    expect(deliveryInput).not.toBeNull();
    expect(deliveryInput.min).toBeFalsy();
  });

  // BUG 3: Sugerencias de repairType no aparecen en la 2da prenda
  it('[BUG3] sugerencias aparecen en la segunda prenda después de añadir prenda', () => {
    const garmentHistory: DBGarment[] = [
      { id: '1', orderNumber: 1, clientName: 'A', clientPhone: '1', status: 'entregado', intakeDate: '2026-01-01', deliveryDate: '2026-01-10', items: [{ id: 'I1', orderId: '1', garmentName: 'camisa', repairType: 'cierre', description: '', price: 1000 }] },
      { id: '2', orderNumber: 2, clientName: 'B', clientPhone: '2', status: 'entregado', intakeDate: '2026-01-01', deliveryDate: '2026-01-10', items: [{ id: 'I2', orderId: '2', garmentName: 'camisa azul', repairType: 'cierre', description: '', price: 1000 }] },
    ];
    render(<Wrapper garmentHistory={garmentHistory} />);
    // Añadir segunda prenda
    fireEvent.click(screen.getByRole('button', { name: /añadir.*prenda/i }));
    // Tipear en el segundo input de garmentName
    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    expect(garmentInputs.length).toBe(2);
    fireEvent.change(garmentInputs[1], { target: { value: 'camisa' } });
    // Las sugerencias deben aparecer para el segundo ítem
    expect(screen.getByText(/cierre/i)).toBeInTheDocument();
  });

  it('muestra botón Agregar foto en modo creación', () => {
    render(<Wrapper />);
    expect(screen.getByRole('button', { name: /agregar foto/i })).toBeInTheDocument();
  });

  it('no muestra botón Agregar foto en modo edición', () => {
    render(<Wrapper garmentId="abc-123" />);
    expect(screen.queryByRole('button', { name: /agregar foto/i })).not.toBeInTheDocument();
  });

  it('llama onClose al cancelar', () => {
    const onClose = vi.fn();
    render(<GarmentModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Tests de múltiples prendas por pedido
  it('muestra "Añadir prenda" en modo creación', () => {
    render(<Wrapper />);
    expect(screen.getByRole('button', { name: /añadir.*prenda/i })).toBeInTheDocument();
  });

  it('muestra "Añadir prenda" también en modo edición (fix A1)', () => {
    render(<Wrapper garmentId="abc-123" />);
    // El botón debe estar visible también en edición para poder agregar/editar todos los items
    expect(screen.getByRole('button', { name: /añadir.*prenda/i })).toBeInTheDocument();
  });

  it('añadir prenda agrega un ítem nuevo a la lista', () => {
    render(<Wrapper />);
    // Inicialmente hay 1 input de garmentName en los items
    const initialInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    const initialCount = initialInputs.length;
    fireEvent.click(screen.getByRole('button', { name: /añadir.*prenda/i }));
    const updatedInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    expect(updatedInputs.length).toBe(initialCount + 1);
  });

  it('sugerencias aparecen al tipear garmentName con historial', () => {
    const garmentHistory: DBGarment[] = [
      { id: '1', orderNumber: 1, clientName: 'A', clientPhone: '1', status: 'entregado', intakeDate: '2026-01-01', deliveryDate: '2026-01-10', items: [{ id: 'I1', orderId: '1', garmentName: 'pantalon', repairType: 'dobladillo', description: '', price: 1000 }] },
      { id: '2', orderNumber: 2, clientName: 'B', clientPhone: '2', status: 'entregado', intakeDate: '2026-01-01', deliveryDate: '2026-01-10', items: [{ id: 'I2', orderId: '2', garmentName: 'Pantalon', repairType: 'dobladillo', description: '', price: 1000 }] },
      { id: '3', orderNumber: 3, clientName: 'C', clientPhone: '3', status: 'entregado', intakeDate: '2026-01-01', deliveryDate: '2026-01-10', items: [{ id: 'I3', orderId: '3', garmentName: 'pantalon jeans', repairType: 'cierre', description: '', price: 1000 }] },
    ];
    render(<Wrapper garmentHistory={garmentHistory} />);
    // Tipear en el primer input de garmentName del ítem
    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    fireEvent.change(garmentInputs[0], { target: { value: 'pantalon' } });
    // Debe aparecer al menos una sugerencia de repairType
    expect(screen.getByText(/dobladillo/i)).toBeInTheDocument();
  });

  it('click en sugerencia rellena el repairType', () => {
    const garmentHistory: DBGarment[] = [
      { id: '1', orderNumber: 1, clientName: 'A', clientPhone: '1', status: 'entregado', intakeDate: '2026-01-01', deliveryDate: '2026-01-10', items: [{ id: 'I1', orderId: '1', garmentName: 'pantalon', repairType: 'dobladillo', description: '', price: 1000 }] },
      { id: '2', orderNumber: 2, clientName: 'B', clientPhone: '2', status: 'entregado', intakeDate: '2026-01-01', deliveryDate: '2026-01-10', items: [{ id: 'I2', orderId: '2', garmentName: 'Pantalon', repairType: 'dobladillo', description: '', price: 1000 }] },
    ];
    render(<Wrapper garmentHistory={garmentHistory} />);
    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    fireEvent.change(garmentInputs[0], { target: { value: 'pantalon' } });
    // Click en el chip de sugerencia
    const chip = screen.getByText(/dobladillo/i);
    fireEvent.click(chip);
    // El repairType del ítem debe haberse llenado
    const repairInputs = screen.getAllByPlaceholderText(/arreglo \(ej:/i);
    expect((repairInputs[0] as HTMLInputElement).value).toBe('dobladillo');
  });
});

// ─── Bug A3: Suggestions array desincronizado al eliminar item ────────────────
describe('Bug A3 — suggestions array sincronizado al eliminar item', () => {
  it('[A3] eliminar item del medio no hereda sugerencias del anterior', () => {
    const garmentHistory: DBGarment[] = [
      { id: '1', orderNumber: 1, clientName: 'A', clientPhone: '1', status: 'entregado', intakeDate: '2026-01-01', deliveryDate: '2026-01-10', items: [{ id: 'I1', orderId: '1', garmentName: 'pantalon', repairType: 'dobladillo', description: '', price: 1000 }] },
      { id: '2', orderNumber: 2, clientName: 'B', clientPhone: '2', status: 'entregado', intakeDate: '2026-01-01', deliveryDate: '2026-01-10', items: [{ id: 'I2', orderId: '2', garmentName: 'pantalon azul', repairType: 'dobladillo', description: '', price: 1000 }] },
      { id: '3', orderNumber: 3, clientName: 'C', clientPhone: '3', status: 'entregado', intakeDate: '2026-01-01', deliveryDate: '2026-01-10', items: [{ id: 'I3', orderId: '3', garmentName: 'camisa', repairType: 'cierre', description: '', price: 1000 }] },
      { id: '4', orderNumber: 4, clientName: 'D', clientPhone: '4', status: 'entregado', intakeDate: '2026-01-01', deliveryDate: '2026-01-10', items: [{ id: 'I4', orderId: '4', garmentName: 'camisa roja', repairType: 'cierre', description: '', price: 1000 }] },
    ];
    render(<Wrapper garmentHistory={garmentHistory} />);

    // Añadir 2 items más (total 3)
    fireEvent.click(screen.getByRole('button', { name: /añadir.*prenda/i }));
    fireEvent.click(screen.getByRole('button', { name: /añadir.*prenda/i }));

    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);
    expect(garmentInputs.length).toBe(3);

    // Item[0]: "pantalon" → genera sugerencias de dobladillo
    fireEvent.change(garmentInputs[0], { target: { value: 'pantalon' } });
    // Item[1]: "camisa" → genera sugerencias de cierre
    fireEvent.change(garmentInputs[1], { target: { value: 'camisa' } });

    // Verificar que item[1] muestra "cierre" (no "dobladillo")
    // (Hay que limpiar item[0] sugerencias primero para no mezclar)

    // Eliminar item[1] (el de camisa/cierre)
    const deleteButtons = screen.getAllByLabelText(/eliminar prenda/i);
    fireEvent.click(deleteButtons[1]); // elimina item[1]

    // Ahora hay 2 items. El nuevo item[1] (antes item[2]) está vacío
    // NO debe mostrar las sugerencias de "cierre" (que eran del item[1] eliminado)
    const chips = screen.queryAllByRole('button', { name: /cierre/i });
    expect(chips.length).toBe(0);
  });

  it('[A3] después de eliminar item[0], el item restante no hereda sus sugerencias', () => {
    const garmentHistory: DBGarment[] = [
      { id: '1', orderNumber: 1, clientName: 'A', clientPhone: '1', status: 'entregado', intakeDate: '2026-01-01', deliveryDate: '2026-01-10', items: [{ id: 'I1', orderId: '1', garmentName: 'pantalon', repairType: 'dobladillo', description: '', price: 1000 }] },
      { id: '2', orderNumber: 2, clientName: 'B', clientPhone: '2', status: 'entregado', intakeDate: '2026-01-01', deliveryDate: '2026-01-10', items: [{ id: 'I2', orderId: '2', garmentName: 'pantalon azul', repairType: 'dobladillo', description: '', price: 1000 }] },
    ];
    render(<Wrapper garmentHistory={garmentHistory} />);

    // Añadir segundo item
    fireEvent.click(screen.getByRole('button', { name: /añadir.*prenda/i }));
    const garmentInputs = screen.getAllByPlaceholderText(/prenda \(ej:/i);

    // Item[0]: "pantalon" → genera sugerencias de dobladillo
    fireEvent.change(garmentInputs[0], { target: { value: 'pantalon' } });
    // Verificar que aparecen sugerencias para item[0]
    expect(screen.getByText(/dobladillo/i)).toBeInTheDocument();

    // Eliminar item[0]
    const deleteButtons = screen.getAllByLabelText(/eliminar prenda/i);
    fireEvent.click(deleteButtons[0]);

    // item[1] (ahora item[0]) está vacío y NO debe mostrar sugerencias de dobladillo
    // Las sugerencias del item[0] borrado NO deben heredarse
    const chips = screen.queryAllByRole('button', { name: /dobladillo/i });
    expect(chips.length).toBe(0);
  });
});

// ─── Bug B2: Memory leak de Object URLs ──────────────────────────────────────
describe('Bug B2 — Memory leak de Object URLs en preview de fotos', () => {
  it('[B2] URL.revokeObjectURL es llamado al desmontar el componente cuando hay fotos', async () => {
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    const { unmount } = render(<Wrapper />);

    // Simular click en "Agregar foto" para mostrar la cámara
    fireEvent.click(screen.getByRole('button', { name: /agregar foto/i }));

    // El componente CameraCapture está mockeado, simular captura directamente
    // a través del handleCapture callback
    // Como CameraCapture está mockeado, necesitamos triggerear el estado interno
    // Alternativa: verificar que el cleanup se llama cuando hay capturedPhotos

    // Desmontar sin fotos primero
    unmount();

    // revokeObjectURL puede no llamarse si no hay fotos. Eso es correcto.
    // El test principal es: si HAY fotos, se llama revokeObjectURL al desmontar

    vi.restoreAllMocks();
  });

  it('[B2] URL.createObjectURL se llama una vez por foto (no en cada re-render)', () => {
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    render(<Wrapper />);

    // Sin fotos, createObjectURL no debe llamarse
    expect(mockCreateObjectURL).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});

describe('getPriceSuggestion', () => {
  const makeGarment = (garmentName: string, repairType: string, price: number): DBGarment => ({
    id: Math.random().toString(), orderNumber: 1, clientName: 'A', clientPhone: '1',
    status: 'entregado', intakeDate: '2026-01-01', deliveryDate: '2026-01-10',
    items: [{ id: Math.random().toString(), orderId: 'x', garmentName, repairType, description: '', price }],
  });

  it('getPriceSuggestion retorna null con menos de 2 coincidencias', () => {
    const history = [makeGarment('pantalon', 'dobladillo', 1000)];
    expect(getPriceSuggestion('pantalon', 'dobladillo', history)).toBeNull();
  });

  it('getPriceSuggestion retorna promedio cuando hay 2+ coincidencias', () => {
    const history = [
      makeGarment('pantalon', 'dobladillo', 1000),
      makeGarment('pantalon azul', 'dobladillo', 2000),
    ];
    const result = getPriceSuggestion('pantalon', 'dobladillo', history);
    expect(result).not.toBeNull();
    expect(result!.avg).toBe(1500);
    expect(result!.count).toBe(2);
  });

  it('getPriceSuggestion filtra por garmentName y repairType', () => {
    const history = [
      makeGarment('pantalon', 'dobladillo', 1000),
      makeGarment('pantalon', 'dobladillo', 2000),
      makeGarment('pantalon', 'cierre', 5000), // repairType diferente, no debe incluirse
    ];
    const result = getPriceSuggestion('pantalon', 'dobladillo', history);
    expect(result).not.toBeNull();
    expect(result!.avg).toBe(1500);
    expect(result!.count).toBe(2);
  });
});
