import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler.js';

const router = Router();

/**
 * @route GET /api/public/zenco/order/:id
 * @desc Consulta publica de estado de pedido sin autenticacion
 */
router.get('/zenco/order/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  let order;
  if (id.length > 10) {
    // Busqueda por UUID completo
    order = await prisma.order.findUnique({ where: { id } });
  } else {
    // Busqueda por ID corto (ultimos 6 caracteres)
    // Nota: En produccion real se deberia indexar una columna shortId
    order = await prisma.order.findFirst({
      where: { 
        id: { endsWith: id.toLowerCase() },
      },
    });
  }

  if (!order) {
    throw new NotFoundError('No encontramos ningun pedido con ese codigo.');
  }

  // Devolvemos solo informacion no sensible para el cliente
  res.json({
    id: order.id,
    clientName: order.clientName,
    garmentName: order.garmentName,
    repairType: order.repairType,
    status: order.status,
    deliveryDate: order.deliveryDate,
    price: order.price,
    deposit: order.deposit,
  });
}));

export { router as publicRoutes };
