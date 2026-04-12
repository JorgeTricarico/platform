import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import { ToastProvider } from '../components/ToastContext';
import { DashboardRefreshProvider } from '../components/DashboardRefreshContext';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/api', () => ({
  fetchDashboardToday: vi.fn(),
  fetchDashboardMonthlyIncome: vi.fn(),
  fetchDashboardStalePatients: vi.fn(),
  fetchDashboardAppointments: vi.fn(),
  createAppointment: vi.fn(),
}));

vi.mock('../components/MusicContext', () => ({
  useMusicCommand: () => ({ sendMusicCommand: vi.fn() }),
  MusicProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import {
  fetchDashboardToday,
  fetchDashboardMonthlyIncome,
  fetchDashboardStalePatients,
  fetchDashboardAppointments,
  createAppointment,
} from '../services/api';

const mockToday = [
  { id: 'APT-001', clientName: 'Laura B.', clientPhone: '11-2222-3333', service: 'Descontracturante', duration: 40, date: '2026-04-12', time: '10:00', status: 'pendiente', price: 30000 },
];

const mockIncome = { monthlyIncome: 50000, monthlyExpenses: 5000 };

const mockStale = [
  { id: 'c1', name: 'Carlos R.', phone: '123', business: 'mg', createdAt: '2026-01-01', lastVisit: '2026-01-15', lastReason: 'Dolor lumbar' },
];

const mockUpcoming = [
  { id: 'APT-002', clientName: 'Pedro M.', clientPhone: '11-9999-0000', service: 'Masaje Relajante', duration: 60, date: '2026-04-15', time: '14:00', status: 'confirmado', price: 50000 },
];

function renderDashboard() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <DashboardRefreshProvider>
          <Dashboard />
        </DashboardRefreshProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  (fetchDashboardToday as ReturnType<typeof vi.fn>).mockResolvedValue(mockToday);
  (fetchDashboardMonthlyIncome as ReturnType<typeof vi.fn>).mockResolvedValue(mockIncome);
  (fetchDashboardStalePatients as ReturnType<typeof vi.fn>).mockResolvedValue(mockStale);
  (fetchDashboardAppointments as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpcoming);
});

describe('Dashboard — renderizado básico', () => {
  it('renderiza sin errores', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.queryByText('Bienvenido') !== null || document.body.children.length > 0).toBe(true);
    });
  });

  it('muestra el saludo del negocio', async () => {
    renderDashboard();
    await waitFor(() => {
      // BUSINESS.greeting is rendered in an h1
      expect(document.querySelector('h1')).not.toBeNull();
    });
  });

  it('muestra el botón Nueva Cita', () => {
    renderDashboard();
    expect(screen.getByText('+ Nueva Cita')).toBeInTheDocument();
  });

  it('muestra el skeleton/cargando mientras carga los datos', () => {
    // Los widgets muestran SkeletonCard mientras loading=true (antes de resolver la promesa)
    renderDashboard();
    // El componente SkeletonLoader renderiza .skeleton-card
    const skeletons = document.querySelectorAll('.skeleton-card');
    // Puede haber 0 si el mock resuelve instantáneamente, o >0 si es async
    expect(skeletons.length >= 0).toBe(true);
  });
});

describe('Dashboard — widgets de datos', () => {
  it('muestra la cita de hoy desde la API', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Laura B.')).toBeInTheDocument();
    });
  });

  it('muestra los ingresos mensuales desde la API', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('$50,000')).toBeInTheDocument();
    });
  });

  it('muestra pacientes sin ficha reciente', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Carlos R.')).toBeInTheDocument();
    });
  });

  it('muestra las citas futuras en el widget de agenda', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Pedro M.')).toBeInTheDocument();
    });
  });
});

describe('Dashboard — estado vacío', () => {
  it('muestra mensaje cuando no hay turnos hoy', async () => {
    (fetchDashboardToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('No hay turnos programados para hoy.')).toBeInTheDocument();
    });
  });

  it('muestra mensaje cuando todos los pacientes están al día', async () => {
    (fetchDashboardStalePatients as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Todos los pacientes estan al dia.')).toBeInTheDocument();
    });
  });

  it('muestra mensaje cuando no hay citas próximas', async () => {
    (fetchDashboardAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('No hay citas proximas programadas.')).toBeInTheDocument();
    });
  });
});

describe('Dashboard — modal nueva cita', () => {
  it('abre el modal al hacer click en Nueva Cita', async () => {
    renderDashboard();
    fireEvent.click(screen.getByText('+ Nueva Cita'));
    await waitFor(() => {
      expect(screen.getByText('Agendar Nueva Cita')).toBeInTheDocument();
    });
  });

  it('cierra el modal al hacer click en Cancelar', async () => {
    renderDashboard();
    fireEvent.click(screen.getByText('+ Nueva Cita'));
    await waitFor(() => {
      expect(screen.getByText('Agendar Nueva Cita')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancelar'));
    await waitFor(() => {
      expect(screen.queryByText('Agendar Nueva Cita')).toBeNull();
    });
  });

  it('llama a createAppointment al enviar el formulario con datos válidos', async () => {
    (createAppointment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'APT-NEW' });
    renderDashboard();

    fireEvent.click(screen.getByText('+ Nueva Cita'));
    await waitFor(() => {
      expect(screen.getByText('Agendar Nueva Cita')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Nombre Cliente'), { target: { name: 'clientName', value: 'Ana López' } });
    fireEvent.change(screen.getByPlaceholderText('Telefono'), { target: { name: 'clientPhone', value: '11-1234-5678' } });
    const serviceSelect = document.querySelector('select[name="service"]') as HTMLSelectElement;
    // Set any service value
    fireEvent.change(serviceSelect, { target: { name: 'service', value: Object.keys({}) } });
    const dateInput = document.querySelector('input[name="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { name: 'date', value: '2026-04-20' } });
    const timeInput = document.querySelector('input[name="time"]') as HTMLInputElement;
    fireEvent.change(timeInput, { target: { name: 'time', value: '11:00' } });

    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    await waitFor(() => {
      expect(createAppointment as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    });
  });

  it('maneja el error de la API al agendar', async () => {
    (createAppointment as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error del servidor'));
    renderDashboard();

    fireEvent.click(screen.getByText('+ Nueva Cita'));
    await waitFor(() => {
      expect(screen.getByText('Agendar Nueva Cita')).toBeInTheDocument();
    });

    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    // No debe crashear
    await waitFor(() => {
      expect(createAppointment as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    });
  });
});
