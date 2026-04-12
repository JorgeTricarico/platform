import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import GarmentModal, { EMPTY_FORM } from './GarmentModal';
import type { GarmentFormState } from './GarmentModal';

vi.mock('../services/api', () => ({
  searchClients: vi.fn().mockResolvedValue([]),
}));

vi.mock('./PhotoGallery', () => ({
  default: () => <div data-testid="photo-gallery">Photos</div>,
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

function Wrapper(props: Partial<typeof defaultProps> & { garmentId?: string }) {
  const [form, setForm] = useState<GarmentFormState>({
    ...EMPTY_FORM,
    clientName: 'Test',
    clientPhone: '123',
    garmentName: 'Pantalon',
    repairType: 'dobladillo',
    description: 'test',
    deliveryDate: '2026-05-01',
    price: 1000,
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

  it('llama onClose al cancelar', () => {
    const onClose = vi.fn();
    render(<GarmentModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
