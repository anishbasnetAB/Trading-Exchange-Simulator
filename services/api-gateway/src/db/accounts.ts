import { db } from './client';

export interface Account {
  id: string;
  user_id: string;
  cash_balance: string; // Postgres NUMERIC comes back as string — always parse it
  status: string;
}

// Get account by user ID
export async function getAccountByUserId(userId: string): Promise<Account | null> {
  const result = await db.query(
    'SELECT id, user_id, cash_balance, status FROM accounts WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] ?? null;
}

// Get all positions for a user
export async function getPositionsByUserId(userId: string) {
  const result = await db.query(
    `SELECT symbol, quantity, average_price, realized_pnl 
     FROM positions WHERE user_id = $1`,
    [userId]
  );
  return result.rows;
}