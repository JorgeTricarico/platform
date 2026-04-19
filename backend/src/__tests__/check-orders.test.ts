import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkOrders } from '../check-orders.js';
import { prisma } from '../db.js';
import { whatsappService } from '../services/whatsapp.js';

// Mocks
vi.mock('../services/whatsapp.js', () => ({
  whatsappService: {
    sendMessage: vi.fn(),
  },
}));

// El mock de prisma ya está configurado en setup.ts, pero necesitamos acceder a sus funciones
const mockPrisma = prisma as any;
const mockWhatsApp = whatsappService as any;

describe('checkOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería enviar mensajes de WhatsApp para todos los pedidos con estado "listo"', async () => {
    const mockOrders = [
      { id: '1', clientPhone: '123456', clientName: 'Juan', garmentName: 'Camisa', status: 'listo' },
      { id: '2', clientPhone: '789012', clientName: 'Maria', garmentName: 'Pantalon', status: 'listo' },
    ];

    mockPrisma.order.findMany.mockResolvedValue(mockOrders);
    mockWhatsApp.sendMessage.mockResolvedValue({ id: 'msg-id' });

    const result = await checkOrders();

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
      where: { status: 'listo' },
    });
    expect(mockWhatsApp.sendMessage).toHaveBeenCalledTimes(2);
    expect(mockWhatsApp.sendMessage).toHaveBeenNthCalledWith(
      1,
      '123456',
      'Hola Juan, tu prenda "Camisa" está lista para retirar!'
    );
    expect(mockWhatsApp.sendMessage).toHaveBeenNthCalledWith(
      2,
      '789012',
      'Hola Maria, tu prenda "Pantalon" está lista para retirar!'
    );
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
      { id: '1', clientPhone: '123456', clientName: 'Juan', garmentName: 'Camisa', status: 'listo' },
      { id: '2', clientPhone: '789012', clientName: 'Maria', garmentName: 'Pantalon', status: 'listo' },
    ];

    mockPrisma.order.findMany.mockResolvedValue(mockOrders);
    // El primero falla, el segundo tiene éxito
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
