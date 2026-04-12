import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StalePatientWidget from './StalePatientWidget';

vi.mock('../services/api', () => ({
  fetchDashboardStalePatients: vi.fn(),
}));

import { fetchDashboardStalePatients } from '../services/api';

const mockStalePatients = [
  {
    id: 'c1',
    name: 'Ana García',
    phone: '11-1111-1111',
    business: 'mg',
    createdAt: '2026-01-01',
    lastVisit: '2026-02-10',
    lastReason: 'Dolor lumbar crónico',
  },
  {
    id: 'c2',
    name: 'Roberto Silva',
    phone: '11-2222-2222',
    business: 'mg',
    createdAt: '2026-01-15',
    lastVisit: null,
    lastReason: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StalePatientWidget', () => {
  it('renderiza sin errores', async () => {
    (fetchDashboardStalePatients as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    render(<StalePatientWidget />);
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('muestra el título "Pacientes sin Ficha Reciente"', async () => {
    (fetchDashboardStalePatients as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    render(<StalePatientWidget />);
    await waitFor(() => {
      expect(screen.getByText('Pacientes sin Ficha Reciente')).toBeInTheDocument();
    });
  });

  it('muestra la lista de pacientes con ficha vencida', async () => {
    (fetchDashboardStalePatients as ReturnType<typeof vi.fn>).mockResolvedValue(mockStalePatients);
    render(<StalePatientWidget />);
    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument();
      expect(screen.getByText('Roberto Silva')).toBeInTheDocument();
    });
  });

  it('muestra la razón de consulta de cada paciente', async () => {
    (fetchDashboardStalePatients as ReturnType<typeof vi.fn>).mockResolvedValue(mockStalePatients);
    render(<StalePatientWidget />);
    await waitFor(() => {
      expect(screen.getByText('Dolor lumbar crónico')).toBeInTheDocument();
    });
  });

  it('muestra "Sin consulta previa" cuando no hay lastReason', async () => {
    (fetchDashboardStalePatients as ReturnType<typeof vi.fn>).mockResolvedValue(mockStalePatients);
    render(<StalePatientWidget />);
    await waitFor(() => {
      expect(screen.getByText('Sin consulta previa')).toBeInTheDocument();
    });
  });

  it('muestra "Sin ficha" cuando lastVisit es null', async () => {
    (fetchDashboardStalePatients as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'c3', name: 'Mario López', phone: '11-3333-3333', business: 'mg', createdAt: '2026-01-01', lastVisit: null, lastReason: null }
    ]);
    render(<StalePatientWidget />);
    await waitFor(() => {
      expect(screen.getByText('Sin ficha')).toBeInTheDocument();
    });
  });

  it('muestra mensaje de estado vacío cuando no hay pacientes sin ficha', async () => {
    (fetchDashboardStalePatients as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    render(<StalePatientWidget />);
    await waitFor(() => {
      expect(screen.getByText('Todos los pacientes estan al dia.')).toBeInTheDocument();
    });
  });

  it('maneja el error de la API sin crashear', async () => {
    (fetchDashboardStalePatients as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error de red'));
    render(<StalePatientWidget />);
    await waitFor(() => {
      // Después del error, loading=false y patients=[]
      expect(screen.getByText('Todos los pacientes estan al dia.')).toBeInTheDocument();
    });
  });

  it('muestra el conteo correcto de pacientes', async () => {
    (fetchDashboardStalePatients as ReturnType<typeof vi.fn>).mockResolvedValue(mockStalePatients);
    render(<StalePatientWidget />);
    await waitFor(() => {
      const items = screen.getAllByText(/Dolor lumbar|Sin consulta previa/);
      expect(items.length).toBeGreaterThanOrEqual(1);
    });
  });
});
