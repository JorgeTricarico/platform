import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { DBGarment } from './api';
import { LOGO_BASE64 } from '../constants/assets';

export async function generateTicket(order: DBGarment): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: [80, 180] });

  // Header Logo - Positioned to the side
  doc.addImage(LOGO_BASE64, 'PNG', 55, 10, 20, 20);

  // Header Text
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ZENKO', 30, 20, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Arreglos de Ropa', 30, 26, { align: 'center' });
  
  // WhatsApp Symbol & Number
  doc.setFillColor(37, 211, 102);
  doc.circle(18, 30, 1.6, 'F');
  doc.setFontSize(5);
  doc.setTextColor(255, 255, 255);
  doc.text('W', 18, 30.7, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.text('11 6574-9397', 34, 31, { align: 'center' });
  
  doc.setFontSize(7);
  doc.text('Independencia 243, Morón', 30, 35, { align: 'center' });

  // Separator
  doc.setDrawColor(200);
  doc.line(5, 38, 75, 38);

  // Order info
  const orderLabel = `ORD-${String(order.orderNumber).padStart(3, '0')}`;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Orden: ${orderLabel}`, 5, 44);
  doc.setFont('helvetica', 'normal');
  doc.text(`Cliente: ${order.clientName.toUpperCase()}`, 5, 50);
  doc.text(`Tel: ${order.clientPhone}`, 5, 55);
  doc.text(`Prenda: ${order.garmentName}`, 5, 60);
  doc.text(`Arreglo: ${order.repairType}`, 5, 65);
  doc.text(`Detalle: ${order.description.slice(0, 40)}`, 5, 70);
  
  let y = 75;
  const fmtDate = (d: string) => {
    if (!d) return '-';
    const date = new Date(d);
    if (d.length <= 10) return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    return date.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  doc.text(`Ingreso: ${fmtDate(order.intakeDate)}`, 5, y); y += 5;
  doc.text(`Entrega: ${new Date(order.deliveryDate + 'T12:00:00').toLocaleDateString('es-AR')}`, 5, y); y += 5;
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Precio: $${order.price.toLocaleString()}`, 5, y); y += 5;
  if (order.deposit) {
    doc.text(`Seña: $${order.deposit.toLocaleString()}`, 5, y); y += 5;
    doc.text(`RESTA ABONAR: $${(order.price - order.deposit).toLocaleString()}`, 5, y); y += 5;
  }

  // QR Code
  // Future URL: https://zenko.ar/orden/[shortId]
  const qrY = y + 5;
  const trackingUrl = `${window.location.origin}/?view=status&order=${order.orderNumber}`;
  const qrDataUrl = await QRCode.toDataURL(trackingUrl, { width: 200, margin: 1 });
  doc.addImage(qrDataUrl, 'PNG', 20, qrY, 40, 40);

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Escanear para ver estado del pedido', 40, qrY + 43, { align: 'center' });

  doc.setFontSize(6);
  doc.text('Pasados los 90 dias sin retirar el local dispone de las prendas.', 40, qrY + 48, { align: 'center' });
  doc.text('Una vez finalizado el arreglo se avisara via', 40, qrY + 51, { align: 'center' });
  doc.text('mensaje de WhatsApp que esta listo para retirarse.', 40, qrY + 54, { align: 'center' });

  doc.save(`ticket-${order.id}.pdf`);
}
