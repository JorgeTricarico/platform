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
  doc.text(`Ingreso: ${order.intakeDate}`, 5, order.location ? 60 : 55);
  doc.text(`Entrega: ${order.deliveryDate}`, 5, order.location ? 65 : 60);
  doc.setFont('helvetica', 'bold');
  doc.text(`Precio: $${order.price.toLocaleString()}`, 5, order.location ? 70 : 65);

  // QR Code
  const qrY = order.location ? 75 : 70;
  const qrData = JSON.stringify({ id: order.id, client: order.clientName, garment: order.garmentName });
  const qrDataUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 1 });
  doc.addImage(qrDataUrl, 'PNG', 20, qrY, 40, 40);

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Escanear para ubicar prenda', 40, qrY + 43, { align: 'center' });

  doc.save(`ticket-${order.id}.pdf`);
}
