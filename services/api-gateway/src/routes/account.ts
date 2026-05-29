import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate';
import { getAccountByUserId, getPositionsByUserId } from '../db/accounts';

export async function accountRoutes(fastify: FastifyInstance) {

  // GET /account/me — returns balance and account status
  // preHandler: authenticate means this runs before the route handler
  // if token is missing/invalid, authenticate rejects it and handler never runs
  fastify.get('/me', { preHandler: authenticate }, async (req, reply) => {
    const account = await getAccountByUserId(req.user!.userId);

    if (!account) {
      return reply.status(404).send({ success: false, error: 'Account not found' });
    }

    return reply.send({
      success: true,
      data: {
        id: account.id,
        cashBalance: parseFloat(account.cash_balance), // convert string to number
        status: account.status,
      },
    });
  });

  // GET /account/positions — returns all open positions
  fastify.get('/positions', { preHandler: authenticate }, async (req, reply) => {
    const positions = await getPositionsByUserId(req.user!.userId);

    return reply.send({
      success: true,
      data: positions.map((p) => ({
        symbol: p.symbol,
        quantity: parseFloat(p.quantity),
        averagePrice: parseFloat(p.average_price),
        realizedPnl: parseFloat(p.realized_pnl),
      })),
    });
  });
}