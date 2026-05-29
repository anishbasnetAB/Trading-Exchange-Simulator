import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate';
import { db } from '../db/client';

export async function tradeRoutes(fastify: FastifyInstance) {
  fastify.get('/:symbol', { preHandler: authenticate }, async (req, reply) => {
    const { symbol } = req.params as { symbol: string };

    try {
      const result = await db.query(
        `SELECT * FROM trades
         WHERE symbol = $1
         ORDER BY executed_at DESC
         LIMIT 50`,
        [symbol.toUpperCase()]
      );
      return reply.send({ success: true, data: result.rows });
    } catch (err) {
      fastify.log.error({ err }, 'Failed to fetch trades');
      return reply.status(500).send({ success: false, error: 'Failed to fetch trades' });
    }
  });
}
