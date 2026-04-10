import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DBPatient, DBPatientRecord } from '../services/api';

export interface ExportPdfOptions {
  patient: DBPatient;
  records: DBPatientRecord[];
}

export function generatePatientPdf({ patient, records }: ExportPdfOptions): jsPDF {
  const doc = new jsPDF();
  const now = new Date().toLocaleDateString('es-AR');

  // Header
  doc.setFontSize(18);
  doc.text('Historia Clínica', 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Consultorio de Masoterapia — Damián', 105, 28, { align: 'center' });

  // Patient info
  doc.setFontSize(12);
  doc.text('Datos del paciente', 14, 42);
  doc.setFontSize(10);
  doc.text(`Nombre: ${patient.name}`, 14, 50);
  doc.text(`Teléfono: ${patient.phone}`, 14, 56);
  if (patient.altPhone) doc.text(`Alternativo: ${patient.altPhone}`, 14, 62);

  // Records table
  const startY = 70;
  doc.setFontSize(12);
  doc.text(`Historial de sesiones (${records.length})`, 14, startY);

  if (records.length > 0) {
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

    autoTable(doc, {
      startY: startY + 4,
      head: [['Fecha', 'Motivo', 'Síntomas', 'Zonas', 'Tratamiento', 'Observaciones', 'Próx. sesión']],
      body: sorted.map(r => [
        r.date,
        r.reason,
        r.symptoms || '-',
        r.areas || '-',
        r.treatment || '-',
        r.observations || '-',
        r.nextSession || '-',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [66, 66, 66] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 28 },
      },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Generado el ${now} — Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
  }

  return doc;
}

export function downloadPatientPdf(options: ExportPdfOptions): void {
  const doc = generatePatientPdf(options);
  const safeName = options.patient.name.replace(/[^a-zA-Z0-9áéíóúñ ]/gi, '').replace(/\s+/g, '-');
  const date = new Date().toISOString().split('T')[0];
  doc.save(`historial-${safeName}-${date}.pdf`);
}
