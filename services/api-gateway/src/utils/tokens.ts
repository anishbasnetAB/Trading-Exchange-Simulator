import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload } from '../types';

// Signs a short-lived access token (15 min)
// Never stored in DB — verified by signature alone
export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: '15m',
  });
}

// Signs a long-lived refresh token (7 days)
// The actual token string gets hashed and stored in DB
export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
}

// Verifies access token — throws if expired or tampered
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
}

// Verifies refresh token — throws if expired or tampered
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as JwtPayload;
}