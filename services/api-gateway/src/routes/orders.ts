import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { checkRisk } from '../services/risk';
import { createOrder, getOrdersByUserId, getOrderById, updateOrderStatus } from '../db/orders';
import { engineService } from '../services/engine';
import { logAuditEvent } from '../db/audit';

const createOrderSchema = z.object({
  symbol: z.enum(['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN']),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['LIMIT', 'MARKET']),
  price: z.number().positive().optional(),
  quantity: z.number().positive(),
}).refine(
  (data) => data.type === 'MARKET' || data.price !== undefined,
  { message: 'Limit orders require a price' }
);

export async function orderRoutes(fastify: FastifyInstance) {

  // POST /orders — place a new order
  fastify.post('/', { preHandler: authenticate }, async (req, reply) => {
    const body = createOrderSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        error: body.error.flatten().fieldErrors,
      });
    }

    const { symbol, side, type, price, quantity } = body.data;
    const userId = req.user!.userId;
    const ip = req.ip;

    // ── Risk check ───────────────────────────────────────────
    const risk = await checkRisk({ userId, symbol, side, type, price, quantity });
    if (!risk.approved) {
      logAuditEvent('RISK_FAILURE', userId, ip, { symbol, side, type, price, quantity, reason: risk.reason });
      return reply.status(400).send({
        success: false,
        error: `Risk check failed: ${risk.reason}`,
      });
    }

    // ── Save to DB ───────────────────────────────────────────
    const order = await createOrder({ userId, symbol, side, type, price, quantity });

    // ── Send to matching engine ──────────────────────────────
    engineService.submitOrder({
      orderId: order.id,
      userId: order.user_id,
      symbol: order.symbol,
      side: order.side,
      orderType: order.type,
      price: order.price ? parseFloat(order.price) : undefined,
      quantity: parseFloat(order.quantity),
    });

    const updated = await updateOrderStatus(order.id, 'ACCEPTED');

    logAuditEvent('ORDER_PLACED', userId, ip, { orderId: order.id, symbol, side, type, price, quantity });

    return reply.status(201).send({ success: true, data: updated });
  });

  // GET /orders — get all orders for current user
  fastify.get('/', { preHandler: authenticate }, async (req, reply) => {
    const orders = await getOrdersByUserId(req.user!.userId);
    return reply.send({ success: true, data: orders });
  });

  // DELETE /orders/:id — cancel an order
  fastify.delete('/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = req.user!.userId;
    const order = await getOrderById(id, userId);

    if (!order) {
      return reply.status(404).send({ success: false, error: 'Order not found' });
    }

    if (['FILLED', 'CANCELLED'].includes(order.status)) {
      return reply.status(400).send({
        success: false,
        error: `Cannot cancel order with status ${order.status}`,
      });
    }

    engineService.cancelOrder(order.symbol, id);
    const cancelled = await updateOrderStatus(id, 'CANCELLED');

    logAuditEvent('ORDER_CANCELLED', userId, req.ip, { orderId: id, symbol: order.symbol });

    return reply.send({ success: true, data: cancelled });
  });
}
