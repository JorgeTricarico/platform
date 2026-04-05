import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Appointments from './Appointments';

vi.mock('../services/api', () => ({
  fetchAppointments: vi.fn(),
  createAppointment: vi.fn(),
  updateAppointmentStatus: vi.fn(),
  updateAppointment: vi.fn(),
}));

const mockAppointments = [
  {
    id: 'APT-001', clientName: 'Laura B.', clientPhone: '11-2222-3333',
    service: 'Masaje Descontracturante', duration: 60,
    date: '2026-04-05', time: '10:00', status: 'pendiente', price: 8000
  },
  {
    id: 'APT-002', clientName: 'Pedro R.', clientPhone: '11-4444-5555',
    service: 'Masaje Relajante', duration: 45,
    date: '2026-04-05', time: '14:00', status: 'confirmado', price: 6000
  }
];

import { fetchAppointments, createAppointment, updateAppointment } from '../services/api';

describe('Appointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchAppointments as ReturnType<typeof vi.fn>).mockResolvedValue(mockAppointments);
  });

  it('renders appointments table with data', async () => {
    render(<Appointments />);
    await waitFor(() => {
      expect(screen.getByText('Laura B.')).toBeDefined();
      expect(screen.getByText('Pedro R.')).toBeDefined();
      expect(screen.getByText('Masaje Descontracturante')).toBeDefined();
      expect(screen.getByText('Masaje Relajante')).toBeDefined();
    });
  });

  it('renders search input with correct CSS class', async () => {
    render(<Appointments />);
    await waitFor(() => {
      expect(screen.getByText('Laura B.')).toBeDefined();
    });
    const searchInput = screen.getByPlaceholderText('Buscar por cliente, servicio o ID...');
    expect(searchInput.className).toContain('input-search');
  });

  it('opens create modal on button click', async () => {
    render(<Appointments />);
    await waitFor(() => {
      expect(screen.getByText('Laura B.')).toBeDefined();
    });
    fireEvent.click(screen.getByText('+ Nueva Cita'));
    await waitFor(() => {
      expect(document.querySelector('.modal-overlay')).not.toBeNull();
    });
  });

  it('modal uses responsive CSS classes', async () => {
    render(<Appointments />);
    await waitFor(() => {
      expect(screen.getByText('Laura B.')).toBeDefined();
    });
    fireEvent.click(screen.getByText('+ Nueva Cita'));
    await waitFor(() => {
      const modalCard = document.querySelector('.modal-card');
      expect(modalCard).not.toBeNull();
      expect(modalCard!.className).toContain('modal-md');
    });
  });

  it('form uses CSS utility classes', async () => {
    render(<Appointments />);
    await waitFor(() => {
      expect(screen.getByText('Laura B.')).toBeDefined();
    });
    fireEvent.click(screen.getByText('+ Nueva Cita'));
    await waitFor(() => {
      expect(document.querySelector('.form-group')).not.toBeNull();
      expect(document.querySelector('.form-actions')).not.toBeNull();
    });
  });
});

describe('D18 — Edit appointment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchAppointments as ReturnType<typeof vi.fn>).mockResolvedValue(mockAppointments);
    (updateAppointment as ReturnType<typeof vi.fn>).mockResolvedValue(mockAppointments[0]);
  });

  it('renders Editar button per appointment row', async () => {
    render(<Appointments />);
    await waitFor(() => {
      expect(screen.getByText('Laura B.')).toBeDefined();
    });
    const editButtons = screen.getAllByText('Editar');
    expect(editButtons.length).toBe(mockAppointments.length);
  });

  it('opens edit modal pre-populated with appointment data', async () => {
    render(<Appointments />);
    await waitFor(() => {
      expect(screen.getByText('Laura B.')).toBeDefined();
    });
    fireEvent.click(screen.getAllByText('Editar')[0]);
    await waitFor(() => {
      expect(screen.getByText('Editar Cita')).toBeDefined();
      const nameInput = screen.getByDisplayValue('Laura B.') as HTMLInputElement;
      expect(nameInput.value).toBe('Laura B.');
      const phoneInput = screen.getByDisplayValue('11-2222-3333') as HTMLInputElement;
      expect(phoneInput.value).toBe('11-2222-3333');
    });
  });

  it('calls updateAppointment on edit submit', async () => {
    render(<Appointments />);
    await waitFor(() => {
      expect(screen.getByText('Laura B.')).toBeDefined();
    });
    fireEvent.click(screen.getAllByText('Editar')[0]);
    await waitFor(() => {
      expect(screen.getByText('Editar Cita')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Guardar Cambios'));
    await waitFor(() => {
      expect(updateAppointment as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
        'APT-001',
        expect.objectContaining({ clientName: 'Laura B.' })
      );
    });
  });
});

describe('D20 — Conflict display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchAppointments as ReturnType<typeof vi.fn>).mockResolvedValue(mockAppointments);
  });

  it('shows conflict error when createAppointment returns 409', async () => {
    const conflictError = Object.assign(new Error('Conflicto de horario'), { status: 409 });
    (createAppointment as ReturnType<typeof vi.fn>).mockRejectedValue(conflictError);

    render(<Appointments />);
    await waitFor(() => {
      expect(screen.getByText('Laura B.')).toBeDefined();
    });
    fireEvent.click(screen.getByText('+ Nueva Cita'));
    await waitFor(() => {
      expect(document.querySelector('.modal-overlay')).not.toBeNull();
    });

    // Fill in required fields and submit
    fireEvent.change(screen.getByPlaceholderText('Nombre Cliente'), { target: { name: 'clientName', value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('Telefono'), { target: { name: 'clientPhone', value: '11-1111-1111' } });
    // Select a service to pass HTML required validation
    const serviceSelect = document.querySelector('select[name="service"]') as HTMLSelectElement;
    fireEvent.change(serviceSelect, { target: { name: 'service', value: 'Masaje Relajante' } });
    fireEvent.change(screen.getByPlaceholderText('Duracion (min)'), { target: { name: 'duration', value: '60' } });
    fireEvent.change(screen.getByPlaceholderText('Precio ($)'), { target: { name: 'price', value: '5000' } });
    // Set a date and time
    const dateInput = document.querySelector('input[name="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { name: 'date', value: '2026-04-06' } });
    const timeInput = document.querySelector('input[name="time"]') as HTMLInputElement;
    fireEvent.change(timeInput, { target: { name: 'time', value: '10:00' } });

    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    await waitFor(() => {
      expect(screen.getByText('Conflicto de horario')).toBeDefined();
    });
  });
});
