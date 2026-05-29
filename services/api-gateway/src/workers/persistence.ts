import { subscriber } from '../services/redis';
import { db } from '../db/client';

interface TradeEvent {
  type: 'TRADE';
  symbol: string;
  price: number;
  quantity: number;
  buyOrderId: string;
  sellOrderId: string;
  buyUserId: string;
  sellUserId: string;
}

async function persistTrade(event: TradeEvent): Promise<void> {
  // Use a single client with a transaction so the trade row and both position
  // upserts either all commit or all roll back — partial writes would corrupt PnL
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO trades
         (symbol, buy_order_id, sell_order_id, buyer_user_id, seller_user_id, price, quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        event.symbol,
        event.buyOrderId,
        event.sellOrderId,
        event.buyUserId,
        event.sellUserId,
        event.price,
        event.quantity,
      ]
    );

    // Buyer: blend new fill into existing cost basis
    await client.query(
      `INSERT INTO positions (user_id, symbol, quantity, average_price, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, symbol) DO UPDATE SET
         average_price = (
           positions.quantity * positions.average_price + $3 * $4
         ) / (positions.quantity + $3),
         quantity = positions.quantity + $3,
         updated_at = NOW()`,
      [event.buyUserId, event.symbol, event.quantity, event.price]
    );

    // Seller: reduce position, realize PnL against their cost basis
    await client.query(
  `INSERT INTO positions (user_id, symbol, quantity, average_price, realized_pnl, updated_at)
   VALUES ($1, $2, ($3 * -1), $4, 0, NOW())
   ON CONFLICT (user_id, symbol) DO UPDATE SET
     realized_pnl = positions.realized_pnl + ($4 - positions.average_price) * $3,
     quantity     = positions.quantity - $3,
     updated_at   = NOW()`,
  [event.sellUserId, event.symbol, event.quantity, event.price]
);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('persistTrade rolled back:', err);
  } finally {
    client.release();
  }
}

export async function startPersistenceWorker(): Promise<void> {
  // psubscribe handles all symbols without listing them individually
  await subscriber.psubscribe('market.trades.*');

  subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
    try {
      const event = JSON.parse(message) as TradeEvent;
      if (event.type !== 'TRADE') return;

      // Fire-and-forget — errors are caught inside persistTrade so they don't
      // crash the pmessage handler or block the next event
      persistTrade(event).catch((err) => {
        console.error(`Unhandled persistTrade error on ${channel}:`, err);
      });
    } catch (err) {
      console.error(`Failed to parse message on ${channel}:`, err);
    }
  });

  console.log('Persistence worker started — subscribed to market.trades.*');
}
