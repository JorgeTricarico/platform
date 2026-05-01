import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkOrders } from '../check-orders.js';
import { prisma } from '../db.js';
import { whatsappService } from '../services/whatsapp.js';

vi.mock('../services/whatsapp.js', () => ({
  whatsappService: {
    sendMessage: vi.fn(),
  },
}));

const mockPrisma = prisma as any;
const mockWhatsApp = whatsappService as any;

const makeOrder = (id: string, clientPhone: string, clientName: string, garmentName: string) => ({
  id, clientPhone, clientName, status: 'listo',
  items: [{ id: `ITEM-${id}`, orderId: id, garmentName, repairType: 'arreglo', description: '', price: 1000 }],
});

describe('checkOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería enviar mensajes de WhatsApp para todos los pedidos con estado "listo"', async () => {
    const mockOrders = [
      makeOrder('1', '123456', 'Juan', 'Camisa'),
      makeOrder('2', '789012', 'Maria', 'Pantalon'),
    ];

    mockPrisma.order.findMany.mockResolvedValue(mockOrders);
    mockWhatsApp.sendMessage.mockResolvedValue({ id: 'msg-id' });

    const result = await checkOrders();

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'listo' } })
    );
    expect(mockWhatsApp.sendMessage).toHaveBeenCalledTimes(2);
    expect(mockWhatsApp.sendMessage).toHaveBeenNthCalledWith(1, '123456', expect.stringContaining('Camisa'));
    expect(mockWhatsApp.sendMessage).toHaveBeenNthCalledWith(2, '789012', expect.stringContaining('Pantalon'));
    expect(result).toEqual(mockOrders);
  });

  it('no debería enviar mensajes si no hay pedidos "listos"', async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);

    const result = await checkOrders();

    expect(mockPrisma.order.findMany).toHaveBeenCalled();
    expect(mockWhatsApp.sendMessage).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('debería manejar errores individuales en el envío de WhatsApp sin detener el proceso', async () => {
    const mockOrders = [
      makeOrder('1', '123456', 'Juan', 'Camisa'),
      makeOrder('2', '789012', 'Maria', 'Pantalon'),
    ];

    mockPrisma.order.findMany.mockResolvedValue(mockOrders);
    mockWhatsApp.sendMessage
      .mockRejectedValueOnce(new Error('WhatsApp connection failed'))
      .mockResolvedValueOnce({ id: 'msg-id' });

    const result = await checkOrders();

    expect(mockWhatsApp.sendMessage).toHaveBeenCalledTimes(2);
    expect(result).toEqual(mockOrders);
  });

  it('debería lanzar un error si falla la consulta a la base de datos', async () => {
    mockPrisma.order.findMany.mockRejectedValue(new Error('Database error'));

    await expect(checkOrders()).rejects.toThrow('Database error');
    expect(mockWhatsApp.sendMessage).not.toHaveBeenCalled();
  });
});
