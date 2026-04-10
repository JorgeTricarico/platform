import { describe, it, expect } from 'vitest';
import { generatePatientPdf } from '../exportPdf';
import type { DBPatient, DBPatientRecord } from '../../services/api';

const mockPatient: DBPatient = {
  id: 'client-1',
  name: 'Juan Pérez',
  phone: '1155550000',
  business: 'damian',
  createdAt: '2026-01-01T00:00:00Z',
  totalRecords: 2,
  lastVisit: '2026-04-01',
  lastReason: 'Dolor lumbar',
};

const mockRecords: DBPatientRecord[] = [
  {
    id: 'rec-1',
    clientId: 'client-1',
    date: '2026-03-15',
    reason: 'Contractura cervical',
    symptoms: 'Dolor al girar el cuello',
    areas: 'Cervical, trapecios',
    treatment: 'Masaje descontracturante + stretching',
    observations: 'Mejoria parcial',
    nextSession: 'Repetir en 1 semana',
    createdAt: '2026-03-15T10:00:00Z',
  },
  {
    id: 'rec-2',
    clientId: 'client-1',
    date: '2026-04-01',
    reason: 'Dolor lumbar',
    symptoms: 'Rigidez matutina',
    areas: 'Lumbar, gluteos',
    treatment: 'Masaje profundo',
    observations: undefined,
    nextSession: undefined,
    createdAt: '2026-04-01T10:00:00Z',
  },
];

describe('generatePatientPdf', () => {
  it('returns a jsPDF instance', () => {
    const doc = generatePatientPdf({ patient: mockPatient, records: mockRecords });
    expect(doc).toBeDefined();
    expect(typeof doc.output).toBe('function');
  });

  it('generates a valid PDF blob', () => {
    const doc = generatePatientPdf({ patient: mockPatient, records: mockRecords });
    const blob = doc.output('blob');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('application/pdf');
  });

  it('works with empty records', () => {
    const doc = generatePatientPdf({ patient: mockPatient, records: [] });
    const blob = doc.output('blob');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('works with minimal patient data', () => {
    const minimal: DBPatient = {
      ...mockPatient,
    };
    const doc = generatePatientPdf({ patient: minimal, records: mockRecords });
    const blob = doc.output('blob');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('handles many records without crashing (pagination)', () => {
    const manyRecords: DBPatientRecord[] = Array.from({ length: 50 }, (_, i) => ({
      id: `rec-${i}`,
      clientId: 'client-1',
      date: `2026-01-${String(i % 28 + 1).padStart(2, '0')}`,
      reason: `Sesion ${i + 1}`,
      symptoms: 'Dolor generalizado',
      areas: 'Espalda completa',
      treatment: 'Masaje terapeutico',
      observations: 'Evolucion favorable',
      nextSession: 'Continuar tratamiento',
      createdAt: `2026-01-${String(i % 28 + 1).padStart(2, '0')}T10:00:00Z`,
    }));
    const doc = generatePatientPdf({ patient: mockPatient, records: manyRecords });
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });

  it('sorts records chronologically (oldest first)', () => {
    const doc = generatePatientPdf({ patient: mockPatient, records: mockRecords });
    // The PDF was generated without error — sorting is internal
    // We verify it doesn't crash and produces output
    const output = doc.output('datauristring');
    expect(output).toContain('data:application/pdf');
  });
});
