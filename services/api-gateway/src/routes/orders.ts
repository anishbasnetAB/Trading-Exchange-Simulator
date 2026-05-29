import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { checkRisk } from '../db/risk';
import { createOrder, getOrdersByUserId, getOrderById, updateOrderStatus } from '../db/orders';

const createOrderSchema = z.object({
  symbol: z.enum(['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN']),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['LIMIT', 'MARKET']),
  price: z.number().positive().optional(),
  quantity: z.number().positive(),
}).refine(
  // Limit orders must have a price
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

    // ── Risk check ───────────────────────────────────────────
    const risk = await checkRisk({ userId, symbol, side, type, price, quantity });
    if (!risk.approved) {
      return reply.status(400).send({
        success: false,
        error: `Risk check failed: ${risk.reason}`,
      });
    }

    // ── Create order in DB ───────────────────────────────────
    const order = await createOrder({ userId, symbol, side, type, price, quantity });

    // ── TODO Phase 7: send to matching engine via Redis ──────
    // For now, mark as ACCEPTED immediately
    const updated = await updateOrderStatus(order.id, 'ACCEPTED');

    return reply.status(201).send({
      success: true,
      data: updated,
    });
  });

  // GET /orders — get all orders for current user
  fastify.get('/', { preHandler: authenticate }, async (req, reply) => {
    const orders = await getOrdersByUserId(req.user!.userId);
    return reply.send({ success: true, data: orders });
  });

  // DELETE /orders/:id — cancel an order
  fastify.delete('/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const order = await getOrderById(id, req.user!.userId);

    if (!order) {
      return reply.status(404).send({ success: false, error: 'Order not found' });
    }

    if (['FILLED', 'CANCELLED'].includes(order.status)) {
      return reply.status(400).send({
        success: false,
        error: `Cannot cancel order with status ${order.status}`,
      });
    }

    const cancelled = await updateOrderStatus(id, 'CANCELLED');
    return reply.send({ success: true, data: cancelled });
  });
}