import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Appointments from './Appointments';
import { ToastProvider } from '../components/ToastContext';

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
    render(<ToastProvider><Appointments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Laura B.')).toBeDefined();
      expect(screen.getByText('Pedro R.')).toBeDefined();
      expect(screen.getByText('Masaje Descontracturante')).toBeDefined();
      expect(screen.getByText('Masaje Relajante')).toBeDefined();
    });
  });

  it('renders search input with correct CSS class', async () => {
    render(<ToastProvider><Appointments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Laura B.')).toBeDefined();
    });
    const searchInput = screen.getByPlaceholderText('Buscar por cliente o servicio...');
    expect(searchInput.className).toContain('input-search');
  });

  it('opens create modal on button click', async () => {
    render(<ToastProvider><Appointments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Laura B.')).toBeDefined();
    });
    fireEvent.click(screen.getByText('+ Nueva Cita'));
    await waitFor(() => {
      expect(document.querySelector('.modal-overlay')).not.toBeNull();
    });
  });

  it('modal uses responsive CSS classes', async () => {
    render(<ToastProvider><Appointments /></ToastProvider>);
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
    render(<ToastProvider><Appointments /></ToastProvider>);
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
    render(<ToastProvider><Appointments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Laura B.')).toBeDefined();
    });
    const editButtons = screen.getAllByText('Editar');
    expect(editButtons.length).toBe(mockAppointments.length);
  });

  it('opens edit modal pre-populated with appointment data', async () => {
    render(<ToastProvider><Appointments /></ToastProvider>);
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
    render(<ToastProvider><Appointments /></ToastProvider>);
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

// 2026-04-07 is Tuesday. Week: Mon Apr 6 – Sun Apr 12.
const d23Appointments = [
  {
    id: 'APT-T1', clientName: 'Hoy Cliente', clientPhone: '11-0001-0001',
    service: 'Masaje Hoy', duration: 60,
    date: '2026-04-07', time: '09:00', status: 'pendiente', price: 5000
  },
  {
    id: 'APT-T2', clientName: 'Semana Cliente', clientPhone: '11-0002-0002',
    service: 'Masaje Semana', duration: 60,
    date: '2026-04-10', time: '11:00', status: 'pendiente', price: 5000
  },
  {
    id: 'APT-T3', clientName: 'Mes Cliente', clientPhone: '11-0003-0003',
    service: 'Masaje Mes', duration: 60,
    date: '2026-04-22', time: '15:00', status: 'pendiente', price: 5000
  },
  {
    id: 'APT-T4', clientName: 'Otro Mes', clientPhone: '11-0004-0004',
    service: 'Masaje Pasado', duration: 60,
    date: '2026-03-15', time: '10:00', status: 'completado', price: 5000
  }
];

describe('D23 — Date filter chips', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-04-07T12:00:00'));
    vi.clearAllMocks();
    (fetchAppointments as ReturnType<typeof vi.fn>).mockResolvedValue(d23Appointments);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders date filter chips: Todos, Hoy, Esta semana, Este mes', async () => {
    render(<ToastProvider><Appointments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Hoy Cliente')).toBeDefined();
    });
    expect(screen.getByText('Todos')).toBeDefined();
    expect(screen.getByText('Hoy')).toBeDefined();
    expect(screen.getByText('Esta semana')).toBeDefined();
    expect(screen.getByText('Este mes')).toBeDefined();
  });

  it('"Todos" chip shows all appointments by default', async () => {
    render(<ToastProvider><Appointments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Hoy Cliente')).toBeDefined();
    });
    expect(screen.getByText('Semana Cliente')).toBeDefined();
    expect(screen.getByText('Mes Cliente')).toBeDefined();
    expect(screen.getByText('Otro Mes')).toBeDefined();
  });

  it('"Hoy" chip filters to only today\'s appointments', async () => {
    render(<ToastProvider><Appointments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Hoy Cliente')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Hoy'));
    await waitFor(() => {
      expect(screen.getByText('Hoy Cliente')).toBeDefined();
    });
    expect(screen.queryByText('Semana Cliente')).toBeNull();
    expect(screen.queryByText('Mes Cliente')).toBeNull();
    expect(screen.queryByText('Otro Mes')).toBeNull();
  });

  it('"Esta semana" chip filters to this week\'s appointments', async () => {
    render(<ToastProvider><Appointments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Hoy Cliente')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Esta semana'));
    await waitFor(() => {
      expect(screen.getByText('Hoy Cliente')).toBeDefined();
    });
    expect(screen.getByText('Semana Cliente')).toBeDefined(); // Apr 10, within week
    expect(screen.queryByText('Mes Cliente')).toBeNull();     // Apr 22, outside week
    expect(screen.queryByText('Otro Mes')).toBeNull();        // Mar 15, outside week
  });

  it('"Este mes" chip filters to this month\'s appointments', async () => {
    render(<ToastProvider><Appointments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Hoy Cliente')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Este mes'));
    await waitFor(() => {
      expect(screen.getByText('Hoy Cliente')).toBeDefined();
    });
    expect(screen.getByText('Semana Cliente')).toBeDefined(); // Apr, same month
    expect(screen.getByText('Mes Cliente')).toBeDefined();    // Apr, same month
    expect(screen.queryByText('Otro Mes')).toBeNull();        // Mar, different month
  });
});

describe('D24 — Próximas / Historial filter', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-04-07T12:00:00'));
    vi.clearAllMocks();
    (fetchAppointments as ReturnType<typeof vi.fn>).mockResolvedValue(d23Appointments);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders Próximas and Historial chips', async () => {
    render(<ToastProvider><Appointments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Hoy Cliente')).toBeDefined();
    });
    expect(screen.getByText('Próximas')).toBeDefined();
    expect(screen.getByText('Historial')).toBeDefined();
  });

  it('"Próximas" shows only today and future appointments', async () => {
    render(<ToastProvider><Appointments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Hoy Cliente')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Próximas'));
    await waitFor(() => {
      expect(screen.getByText('Hoy Cliente')).toBeDefined(); // Apr 7, today
    });
    expect(screen.getByText('Semana Cliente')).toBeDefined(); // Apr 10, future
    expect(screen.getByText('Mes Cliente')).toBeDefined();    // Apr 22, future
    expect(screen.queryByText('Otro Mes')).toBeNull();        // Mar 15, past
  });

  it('"Historial" shows only past appointments', async () => {
    render(<ToastProvider><Appointments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Hoy Cliente')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Historial'));
    await waitFor(() => {
      expect(screen.getByText('Otro Mes')).toBeDefined();     // Mar 15, past
    });
    expect(screen.queryByText('Hoy Cliente')).toBeNull();     // Apr 7, today (not past)
    expect(screen.queryByText('Semana Cliente')).toBeNull();   // Apr 10, future
    expect(screen.queryByText('Mes Cliente')).toBeNull();      // Apr 22, future
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

    render(<ToastProvider><Appointments /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText('Laura B.')).toBeDefined();
    });
    fireEvent.click(screen.getByText('+ Nueva Cita'));
    await waitFor(() => {
      expect(document.querySelector('.modal-overlay')).not.toBeNull();
    });

    // Fill in required fields and submit
    fireEvent.change(screen.getByPlaceholderText('Nombre completo'), { target: { name: 'clientName', value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('Teléfono'), { target: { name: 'clientPhone', value: '11-1111-1111' } });
    // Select a service to pass HTML required validation
    const serviceSelect = document.querySelector('select[name="service"]') as HTMLSelectElement;
    fireEvent.change(serviceSelect, { target: { name: 'service', value: 'Masaje Relajante' } });
    fireEvent.change(screen.getByPlaceholderText('Duración (min)'), { target: { name: 'duration', value: '60' } });
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
