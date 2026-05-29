import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate';

const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'] as const;
type Symbol = typeof SYMBOLS[number];

// Approximate mid-prices for mock depth generation
const MID_PRICE: Record<Symbol, number> = {
  AAPL: 150,
  GOOGL: 175,
  MSFT: 420,
  TSLA: 240,
  AMZN: 185,
};

function mockDepth(symbol: Symbol): { bids: { price: number; quantity: number }[]; asks: { price: number; quantity: number }[] } {
  const mid = MID_PRICE[symbol];
  const levels = 5;
  const bids = Array.from({ length: levels }, (_, i) => ({
    price: +(mid - (i + 1) * 0.5).toFixed(2),
    quantity: (i + 1) * 100,
  }));
  const asks = Array.from({ length: levels }, (_, i) => ({
    price: +(mid + (i + 1) * 0.5).toFixed(2),
    quantity: (i + 1) * 100,
  }));
  return { bids, asks };
}

export async function orderbookRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: { symbol: string } }>(
    '/:symbol',
    { preHandler: authenticate },
    async (req, reply) => {
      const raw = (req.params as { symbol: string }).symbol.toUpperCase();

      if (!(SYMBOLS as readonly string[]).includes(raw)) {
        return reply.status(404).send({ success: false, error: `Unknown symbol: ${raw}` });
      }

      const symbol = raw as Symbol;
      return reply.send({ success: true, data: { symbol, ...mockDepth(symbol) } });
    }
  );
}
