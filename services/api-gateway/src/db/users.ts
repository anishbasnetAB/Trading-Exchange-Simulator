import { db } from './client';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  status: string;
}

// Find user by email — used during login
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await db.query(
    'SELECT id, email, password_hash, role, status FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] ?? null;
}

// Create new user and their account in a transaction
// Transaction = both inserts succeed or both fail — no half-created users
export async function createUser(email: string, passwordHash: string): Promise<User> {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role, status)
       VALUES ($1, $2, 'TRADER', 'ACTIVE')
       RETURNING id, email, role, status`,
      [email, passwordHash]
    );

    const user = userResult.rows[0];

    // Create account with default $100k balance
    await client.query(
      `INSERT INTO accounts (user_id, cash_balance) VALUES ($1, 100000.00)`,
      [user.id]
    );

    await client.query('COMMIT');
    return user;
  } catch (err) {
    // If anything fails, roll back both inserts
    await client.query('ROLLBACK');
    throw err;
  } finally {
    // Always release connection back to pool
    client.release();
  }
}