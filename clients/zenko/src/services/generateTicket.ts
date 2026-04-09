import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { DBGarment } from './api';
import logoThermal from '../assets/logo_thermal.png';

export async function generateTicket(order: DBGarment): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: [80, 180] });

  // Header Logo
  doc.addImage(logoThermal, 'PNG', 27.5, 10, 25, 25);

  // Header Text
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ZENKO', 40, 40, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Arreglos de Ropa — Ana & Ariel', 40, 45, { align: 'center' });

  // Separator
  doc.setDrawColor(200);
  doc.line(5, 48, 75, 48);

  // Order info
  const shortId = order.id.slice(-6).toUpperCase();
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Orden: #${shortId}`, 5, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(`Cliente: ${order.clientName.toUpperCase()}`, 5, 60);
  doc.text(`Tel: ${order.clientPhone}`, 5, 65);
  doc.text(`Prenda: ${order.garmentName}`, 5, 70);
  doc.text(`Arreglo: ${order.repairType}`, 5, 75);
  doc.text(`Detalle: ${order.description.slice(0, 40)}`, 5, 80);
  
  let y = 85;
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
  const trackingUrl = `${window.location.origin}/?view=status&order=${shortId}`;
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
