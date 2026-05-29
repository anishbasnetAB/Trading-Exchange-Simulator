import { db } from './client';

export interface CreateOrderInput {
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET';
  price?: number;
  quantity: number;
}

// Insert a new order into the database
export async function createOrder(input: CreateOrderInput) {
  const result = await db.query(
    `INSERT INTO orders 
      (user_id, symbol, side, type, price, quantity, remaining_quantity, status)
     VALUES ($1, $2, $3, $4, $5, $6, $6, 'NEW')
     RETURNING *`,
    [
      input.userId,
      input.symbol,
      input.side,
      input.type,
      input.price ?? null,
      input.quantity,
    ]
  );
  return result.rows[0];
}

// Get all orders for a user
export async function getOrdersByUserId(userId: string) {
  const result = await db.query(
    `SELECT * FROM orders 
     WHERE user_id = $1 
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

// Get single order — verify it belongs to this user
export async function getOrderById(orderId: string, userId: string) {
  const result = await db.query(
    `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
    [orderId, userId]
  );
  return result.rows[0] ?? null;
}

// Update order status
export async function updateOrderStatus(
  orderId: string,
  status: string,
  remainingQty?: number
) {
  const result = await db.query(
    `UPDATE orders 
     SET status = $1, remaining_quantity = COALESCE($2, remaining_quantity), updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [status, remainingQty ?? null, orderId]
  );
  return result.rows[0];
}