import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Appointments from './Appointments';

vi.mock('../services/api', () => ({
  fetchAppointments: vi.fn(),
  createAppointment: vi.fn(),
  updateAppointmentStatus: vi.fn(),
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

import { fetchAppointments } from '../services/api';

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
