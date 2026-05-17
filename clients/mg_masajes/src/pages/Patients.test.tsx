import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Patients from './Patients';
import { ToastProvider } from '../components/ToastContext';
import { MemoryRouter } from 'react-router-dom';

const mockPatient = {
  id: 'c1',
  name: 'Juan Perez',
  phone: '1111-2222',
  altPhone: null,
  email: 'juan@test.com',
  business: 'mg_masajes',
  notes: 'Contractura cronica',
  createdAt: '2026-01-01T00:00:00.000Z',
  totalRecords: 2,
  lastVisit: '2026-04-01',
  lastReason: 'Cervical',
};

vi.mock('../services/api', () => ({
  fetchPatients: vi.fn(),
  fetchPatientRecords: vi.fn(),
  createPatientRecord: vi.fn(),
  fetchNextAppointment: vi.fn(),
}));

vi.mock('../utils/exportPdf', () => ({
  downloadPatientPdf: vi.fn(),
}));

import { fetchPatients, fetchPatientRecords, fetchNextAppointment } from '../services/api';

beforeEach(() => {
  vi.clearAllMocks();
  (fetchPatients as ReturnType<typeof vi.fn>).mockResolvedValue([mockPatient]);
  (fetchPatientRecords as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (fetchNextAppointment as ReturnType<typeof vi.fn>).mockResolvedValue(null);
});

describe('Patients page (mg_masajes)', () => {
  it('renders patient list', async () => {
    render(<MemoryRouter><ToastProvider><Patients /></ToastProvider></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    });
  });

  it('opens patient detail when Ver Historial is clicked', async () => {
    render(<MemoryRouter><ToastProvider><Patients /></ToastProvider></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Ver Historial'));
    await waitFor(() => {
      expect(screen.getByText('← Volver a lista')).toBeInTheDocument();
    });
  });

  it('shows Próxima Cita widget in patient detail', async () => {
    render(<MemoryRouter><ToastProvider><Patients /></ToastProvider></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Ver Historial'));
    await waitFor(() => {
      expect(screen.getByText('Próxima Cita')).toBeInTheDocument();
    });
  });

  it('shows "Sin citas programadas" when no upcoming appointment', async () => {
    (fetchNextAppointment as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    render(<MemoryRouter><ToastProvider><Patients /></ToastProvider></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Ver Historial'));
    await waitFor(() => {
      expect(screen.getByText('Sin citas programadas')).toBeInTheDocument();
    });
  });

  it('shows appointment details when upcoming appointment exists', async () => {
    (fetchNextAppointment as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'APT-1',
      clientName: 'Juan Perez',
      clientPhone: '1111-2222',
      service: 'Masaje descontracturante',
      duration: 60,
      date: '2026-04-20',
      time: '10:00',
      status: 'pendiente',
      price: 8000,
    });

    render(<MemoryRouter><ToastProvider><Patients /></ToastProvider></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Ver Historial'));
    await waitFor(() => {
      expect(screen.getByText('Masaje descontracturante')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
  });

  it('shows status badge for the upcoming appointment', async () => {
    (fetchNextAppointment as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'APT-2',
      clientName: 'Juan Perez',
      clientPhone: '1111-2222',
      service: 'Reflexologia',
      duration: 45,
      date: '2026-04-25',
      time: '14:00',
      status: 'confirmado',
      price: 6000,
    });

    render(<MemoryRouter><ToastProvider><Patients /></ToastProvider></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Ver Historial'));
    await waitFor(() => {
      expect(screen.getByText('confirmado')).toBeInTheDocument();
    });
  });
});
