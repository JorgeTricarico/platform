import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UpcomingAppointmentsWidget from './UpcomingAppointmentsWidget';
import { DashboardRefreshProvider } from './DashboardRefreshContext';

vi.mock('../services/api', () => ({
  fetchDashboardAppointments: vi.fn(),
}));

import { fetchDashboardAppointments } from '../services/api';

const mockAppointments = [
  {
    id: 'APT-001',
    clientName: 'Laura Martínez',
    clientPhone: '11-2222-3333',
    service: 'Descontracturante Cuello y Espalda',
    duration: 40,
    date: '2026-04-15',
    time: '10:00',
    status: 'pendiente',
    price: 30000,
  },
  {
    id: 'APT-002',
    clientName: 'Pedro Rodríguez',
    clientPhone: '11-4444-5555',
    service: 'Masaje Deportivo',
    duration: 60,
    date: '2026-04-16',
    time: '14:00',
    status: 'confirmado',
    price: 50000,
  },
];

function renderWidget() {
  return render(
    <DashboardRefreshProvider>
      <UpcomingAppointmentsWidget />
    </DashboardRefreshProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UpcomingAppointmentsWidget', () => {
  it('renderiza sin errores', async () => {
    (fetchDashboardAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderWidget();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('muestra el título "Agenda: Citas Futuras"', async () => {
    (fetchDashboardAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderWidget();
    await waitFor(() => {
      expect(screen.getByText('Agenda: Citas Futuras')).toBeInTheDocument();
    });
  });

  it('muestra la lista de citas cuando la API retorna datos', async () => {
    (fetchDashboardAppointments as ReturnType<typeof vi.fn>).mockResolvedValue(mockAppointments);
    renderWidget();
    await waitFor(() => {
      expect(screen.getByText('Laura Martínez')).toBeInTheDocument();
      expect(screen.getByText('Pedro Rodríguez')).toBeInTheDocument();
    });
  });

  it('muestra el servicio de cada cita', async () => {
    (fetchDashboardAppointments as ReturnType<typeof vi.fn>).mockResolvedValue(mockAppointments);
    renderWidget();
    await waitFor(() => {
      expect(screen.getByText('Descontracturante Cuello y Espalda')).toBeInTheDocument();
      expect(screen.getByText('Masaje Deportivo')).toBeInTheDocument();
    });
  });

  it('muestra el horario de cada cita', async () => {
    (fetchDashboardAppointments as ReturnType<typeof vi.fn>).mockResolvedValue(mockAppointments);
    renderWidget();
    await waitFor(() => {
      expect(screen.getByText('10:00')).toBeInTheDocument();
      expect(screen.getByText('14:00')).toBeInTheDocument();
    });
  });

  it('muestra badge "Pendiente" para citas pendientes', async () => {
    (fetchDashboardAppointments as ReturnType<typeof vi.fn>).mockResolvedValue(mockAppointments);
    renderWidget();
    await waitFor(() => {
      expect(screen.getByText('Pendiente')).toBeInTheDocument();
    });
  });

  it('muestra badge "Confirmado" para citas confirmadas', async () => {
    (fetchDashboardAppointments as ReturnType<typeof vi.fn>).mockResolvedValue(mockAppointments);
    renderWidget();
    await waitFor(() => {
      expect(screen.getByText('Confirmado')).toBeInTheDocument();
    });
  });

  it('muestra el teléfono del cliente', async () => {
    (fetchDashboardAppointments as ReturnType<typeof vi.fn>).mockResolvedValue(mockAppointments);
    renderWidget();
    await waitFor(() => {
      expect(screen.getByText('11-2222-3333')).toBeInTheDocument();
    });
  });

  it('muestra mensaje de estado vacío cuando no hay citas próximas', async () => {
    (fetchDashboardAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderWidget();
    await waitFor(() => {
      expect(screen.getByText('No hay citas proximas programadas.')).toBeInTheDocument();
    });
  });

  it('maneja el error de la API sin crashear', async () => {
    (fetchDashboardAppointments as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error de red'));
    renderWidget();
    await waitFor(() => {
      // Después del error, appointments=[] y loading=false
      expect(screen.getByText('No hay citas proximas programadas.')).toBeInTheDocument();
    });
  });

  it('muestra los encabezados de la tabla', async () => {
    (fetchDashboardAppointments as ReturnType<typeof vi.fn>).mockResolvedValue(mockAppointments);
    renderWidget();
    await waitFor(() => {
      expect(screen.getByText('Cliente')).toBeInTheDocument();
      expect(screen.getByText('Servicio')).toBeInTheDocument();
      expect(screen.getByText('Fecha')).toBeInTheDocument();
      expect(screen.getByText('Hora')).toBeInTheDocument();
      expect(screen.getByText('Estado')).toBeInTheDocument();
    });
  });
});
