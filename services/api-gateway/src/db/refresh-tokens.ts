import bcrypt from 'bcrypt';
import { db } from './client';

const BCRYPT_ROUNDS = 10;

// Hash and store a refresh token for later verification.
// bcrypt is used per spec; the high entropy of a JWT means rounds=10 is fine.
export async function storeRefreshToken(userId: string, rawToken: string): Promise<void> {
  const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [userId, tokenHash],
  );
}

// Finds a valid token for userId by bcrypt-comparing against each candidate row.
// O(n) comparisons — bounded by number of active sessions per user (typically 1).
export async function findAndVerifyRefreshToken(
  userId: string,
  rawToken: string,
): Promise<{ id: string } | null> {
  const result = await db.query<{ id: string; token_hash: string }>(
    `SELECT id, token_hash FROM refresh_tokens
     WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [userId],
  );
  for (const row of result.rows) {
    if (await bcrypt.compare(rawToken, row.token_hash)) {
      return { id: row.id };
    }
  }
  return null;
}

export async function revokeRefreshToken(id: string): Promise<void> {
  await db.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
    [id],
  );
}
