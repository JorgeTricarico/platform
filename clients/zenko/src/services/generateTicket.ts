import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { DBGarment } from './api';
import { LOGO_BASE64 } from '../constants/assets';
import { BUSINESS } from '../config/business';

const W = 58;   // papel 58mm
const CX = 29;  // centro horizontal
const ML = 3;   // margen izquierdo
const MR = 55;  // margen derecho

export async function generateTicket(order: DBGarment): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: [W, 200] });

  // Header Text
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(BUSINESS.ticketTitle, CX, 18, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(BUSINESS.ticketSubtitle, CX, 24, { align: 'center' });

  // WhatsApp Symbol & Number
  doc.setFillColor(37, 211, 102);
  doc.circle(18, 28, 1.5, 'F');
  doc.setFontSize(4.5);
  doc.setTextColor(255, 255, 255);
  doc.text('W', 18, 28.7, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7.5);
  doc.text(BUSINESS.whatsappNumber.replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2-$3'), CX, 29, { align: 'center' });

  doc.setFontSize(6.5);
  doc.text(BUSINESS.address, CX, 33, { align: 'center' });

  // Separator
  doc.setDrawColor(200);
  doc.line(ML, 36, MR, 36);

  // Logo (right side, small)
  doc.addImage(LOGO_BASE64, 'PNG', 36, 39, 18, 18);

  // Order info
  const orderLabel = `ORD-${String(order.orderNumber).padStart(6, '0')}`;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Orden: ${orderLabel}`, ML, 41);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Cliente: ${order.clientName.toUpperCase()}`, ML, 46);
  doc.text(`Tel: ${order.clientPhone}`, ML, 51);
  doc.text(`Prenda: ${order.garmentName}`, ML, 56);
  doc.text(`Arreglo: ${order.repairType}`, ML, 61);

  // Description — puede ser larga, truncar a 30 chars
  const desc = order.description?.slice(0, 30) || '';
  if (desc) doc.text(`Detalle: ${desc}`, ML, 66);

  let y = desc ? 71 : 66;

  const fmtDate = (d: string) => {
    if (!d) return '-';
    const date = new Date(d);
    if (d.length <= 10) return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    return date.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  doc.text(`Ingreso: ${fmtDate(order.intakeDate)}`, ML, y); y += 5;
  doc.text(`Entrega: ${new Date(order.deliveryDate + 'T12:00:00').toLocaleDateString('es-AR')}`, ML, y); y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text(`Precio: $${order.price.toLocaleString()}`, ML, y); y += 5;
  if (order.deposit) {
    doc.text(`Seña: $${order.deposit.toLocaleString()}`, ML, y); y += 5;
    doc.text(`RESTA: $${(order.price - order.deposit).toLocaleString()}`, ML, y); y += 5;
  }

  // Separator before QR
  doc.setDrawColor(220);
  doc.line(ML, y + 1, MR, y + 1);

  // QR Code — centrado en 58mm, ancho 36mm
  const qrY = y + 4;
  const appOrigin = window.location.hostname === 'localhost' || window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)
    ? 'https://zenko-app.onrender.com'
    : window.location.origin;
  const trackingUrl = `${appOrigin}/?view=status&order=${order.orderNumber}`;
  const qrDataUrl = await QRCode.toDataURL(trackingUrl, { width: 200, margin: 1 });
  doc.addImage(qrDataUrl, 'PNG', (W - 36) / 2, qrY, 36, 36);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('Escaneá para ver el estado de tu prenda', CX, qrY + 38, { align: 'center' });

  doc.setFontSize(5.5);
  BUSINESS.ticketFooterLines.forEach((line, i) => {
    doc.text(line, CX, qrY + 43 + i * 3.5, { align: 'center' });
  });

  doc.save(`ticket-${order.id}.pdf`);
}
