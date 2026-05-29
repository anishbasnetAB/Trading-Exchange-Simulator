import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

// Hashes a plain text password — never store plain text
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Compares plain text against stored hash
export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}