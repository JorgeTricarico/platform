import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { DBGarment } from './api';

export async function generateTicket(order: DBGarment): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: [80, 140] });

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ZENKO', 40, 10, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Arreglos de Ropa — Ana & Ariel', 40, 15, { align: 'center' });

  // Separator
  doc.setDrawColor(200);
  doc.line(5, 18, 75, 18);

  // Order info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Orden: #${order.id}`, 5, 24);
  doc.setFont('helvetica', 'normal');
  doc.text(`Cliente: ${order.clientName}`, 5, 30);
  doc.text(`Tel: ${order.clientPhone}`, 5, 35);
  doc.text(`Prenda: ${order.garmentName}`, 5, 40);
  doc.text(`Arreglo: ${order.repairType}`, 5, 45);
  doc.text(`Detalle: ${order.description.slice(0, 40)}`, 5, 50);
  if (order.location) {
    doc.text(`Ubicación: ${order.location}`, 5, 55);
  }
  let y = order.location ? 60 : 55;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
  doc.text(`Ingreso: ${fmtDate(order.intakeDate)}`, 5, y); y += 5;
  doc.text(`Entrega: ${fmtDate(order.deliveryDate)}`, 5, y); y += 5;
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Precio: $${order.price.toLocaleString()}`, 5, y); y += 5;
  if (order.deposit) {
    doc.text(`Seña: $${order.deposit.toLocaleString()}`, 5, y); y += 5;
    doc.text(`RESTA ABONAR: $${(order.price - order.deposit).toLocaleString()}`, 5, y); y += 5;
  }

  // QR Code
  const qrY = y + 5;
  const qrData = `Orden: #${order.id}\nFecha de Entrega: ${fmtDate(order.deliveryDate)}`;
  const qrDataUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 1 });
  doc.addImage(qrDataUrl, 'PNG', 20, qrY, 40, 40);

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Escanear para ubicar prenda', 40, qrY + 43, { align: 'center' });

  doc.setFontSize(6);
  doc.text('Pasados los 90 dias sin retirar el local dispone de las prendas.', 40, qrY + 48, { align: 'center' });
  doc.text('Una vez finalizado el arreglo se avisara via', 40, qrY + 51, { align: 'center' });
  doc.text('mensaje de WhatsApp que esta listo para retirarse.', 40, qrY + 54, { align: 'center' });

  doc.save(`ticket-${order.id}.pdf`);
}
