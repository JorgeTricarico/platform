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

  // Logo (right side)
  doc.addImage(LOGO_BASE64, 'PNG', 36, 39, 18, 18);

  // Order info — left column alongside the logo (x from ML=3, max width 32mm before logo at x=36)
  const orderLabel = `ORD-${String(order.orderNumber).padStart(6, '0')}`;
  const COL_W = 32; // max width of left column (logo starts at x=36)

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Orden: ${orderLabel}`, ML, 41);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  // splitTextToSize prevents overflow into logo area
  const clientLines = doc.splitTextToSize(`Cliente: ${order.clientName.toUpperCase()}`, COL_W);
  doc.text(clientLines, ML, 46);
  const clientH = (clientLines.length - 1) * 4;

  doc.text(`Tel: ${order.clientPhone}`, ML, 51 + clientH);

  const items = order.items ?? [];
  const firstItem = items[0];
  const garmentLines = doc.splitTextToSize(`Prenda: ${firstItem?.garmentName ?? '-'}`, COL_W);
  doc.text(garmentLines, ML, 56 + clientH);
  const garmentH = (garmentLines.length - 1) * 4;

  // After logo area (y ≥ 58), full-width content
  let y = Math.max(58, 56 + clientH + garmentH + 4);

  // Items — full width below logo
  for (const item of items) {
    const repairLines = doc.splitTextToSize(`${item.garmentName}: ${item.repairType}`, MR - ML);
    doc.text(repairLines, ML, y);
    y += repairLines.length * 4 + 1;
    const desc = item.description?.slice(0, 40) || '';
    if (desc) {
      const descLines = doc.splitTextToSize(`Detalle: ${desc}`, MR - ML);
      doc.text(descLines, ML, y);
      y += descLines.length * 4 + 1;
    }
  }

  const fmtDate = (d: string) => {
    if (!d) return '-';
    const date = new Date(d);
    if (d.length <= 10) return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    return date.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  doc.text(`Ingreso: ${fmtDate(order.intakeDate)}`, ML, y); y += 5;
  doc.text(`Entrega: ${new Date(order.deliveryDate + 'T12:00:00').toLocaleDateString('es-AR')}`, ML, y); y += 5;

  const total = (order.items ?? []).reduce((s, i) => s + i.price, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(`Precio: $${total.toLocaleString()}`, ML, y); y += 5;
  if (order.deposit) {
    doc.text(`Seña: $${order.deposit.toLocaleString()}`, ML, y); y += 5;
    doc.text(`RESTA: $${(total - order.deposit).toLocaleString()}`, ML, y); y += 5;
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
