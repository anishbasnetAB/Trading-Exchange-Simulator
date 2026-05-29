import { randomUUID } from 'crypto';
import { db } from './client';

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'ORDER_PLACED'
  | 'ORDER_CANCELLED'
  | 'RISK_FAILURE';

// Fire-and-forget — callers must NOT await this.
// Audit failures are silently swallowed so they never crash the request path.
export function logAuditEvent(
  action: AuditAction,
  userId: string | null,
  ip: string,
  metadata?: Record<string, unknown>,
  requestId?: string,
): void {
  db.query(
    `INSERT INTO audit_logs (user_id, action, ip_address, request_id, metadata)
     VALUES ($1, $2, $3::inet, $4, $5)`,
    [
      userId ?? null,
      action,
      ip,
      requestId ?? randomUUID(),
      metadata ? JSON.stringify(metadata) : null,
    ],
  ).catch(() => { /* intentionally swallowed */ });
}
