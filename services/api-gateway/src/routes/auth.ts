import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createUser, findUserByEmail } from '../db/users';
import { hashPassword, verifyPassword } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens';
import { storeRefreshToken, findAndVerifyRefreshToken, revokeRefreshToken } from '../db/refresh-tokens';
import { logAuditEvent } from '../db/audit';
import { ApiResponse } from '../types';

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

// Cookie path covers both /auth/refresh and /auth/logout
const COOKIE_OPTS = {
  httpOnly: true,
  secure: false, // set true in production (HTTPS only)
  sameSite: 'strict' as const,
  path: '/auth',
  maxAge: 60 * 60 * 24 * 7,
} as const;

function getRequestId(req: { headers: Record<string, string | string[] | undefined> }): string | undefined {
  const h = req.headers['x-request-id'];
  return Array.isArray(h) ? h[0] : h;
}

export async function authRoutes(fastify: FastifyInstance) {

  // POST /auth/register — 3 requests per minute per IP
  fastify.post('/register', {
    config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const body = registerSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        error: body.error.flatten().fieldErrors,
      });
    }

    const { email, password } = body.data;

    const existing = await findUserByEmail(email);
    if (existing) {
      return reply.status(409).send({ success: false, error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser(email, passwordHash);

    const response: ApiResponse = {
      success: true,
      data: { id: user.id, email: user.email, role: user.role },
    };

    return reply.status(201).send(response);
  });

  // POST /auth/login — 5 requests per minute per IP
  fastify.post('/login', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: 'Invalid input' });
    }

    const { email, password } = body.data;
    const ip = req.ip;
    const requestId = getRequestId(req as Parameters<typeof getRequestId>[0]);

    const user = await findUserByEmail(email);

    // Always run verifyPassword even if user not found — prevents timing attacks
    // that reveal whether an email exists by measuring response time
    const dummyHash = '$2b$12$invalidhashfortimingnormalisation000000000000000000000';
    const passwordMatch = user
      ? await verifyPassword(password, user.password_hash)
      : await verifyPassword(password, dummyHash);

    if (!user || !passwordMatch) {
      logAuditEvent('LOGIN_FAILURE', user?.id ?? null, ip, { email }, requestId);
      return reply.status(401).send({ success: false, error: 'Invalid email or password' });
    }

    if (user.status !== 'ACTIVE') {
      return reply.status(403).send({ success: false, error: 'Account is suspended' });
    }

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Persist hashed refresh token — allows revocation without keeping plaintext
    await storeRefreshToken(user.id, refreshToken);

    reply.setCookie('refreshToken', refreshToken, COOKIE_OPTS);

    logAuditEvent('LOGIN_SUCCESS', user.id, ip, { email }, requestId);

    return reply.send({
      success: true,
      data: { accessToken, user: { id: user.id, email: user.email, role: user.role } },
    });
  });

  // POST /auth/refresh — exchange a valid refresh token cookie for a new access token
  fastify.post('/refresh', async (req, reply) => {
    const rawToken = req.cookies.refreshToken;
    if (!rawToken) {
      return reply.status(401).send({ success: false, error: 'No refresh token' });
    }

    let payload;
    try {
      payload = verifyRefreshToken(rawToken);
    } catch {
      return reply.status(401).send({ success: false, error: 'Invalid or expired refresh token' });
    }

    const row = await findAndVerifyRefreshToken(payload.userId, rawToken);
    if (!row) {
      // Token was revoked or not found — may indicate token theft
      return reply.status(401).send({ success: false, error: 'Refresh token revoked or not found' });
    }

    const accessToken = signAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });

    return reply.send({ success: true, data: { accessToken } });
  });

  // POST /auth/logout — revoke refresh token and clear cookie
  fastify.post('/logout', async (req, reply) => {
    const rawToken = req.cookies.refreshToken;

    if (rawToken) {
      try {
        const payload = verifyRefreshToken(rawToken);
        const row = await findAndVerifyRefreshToken(payload.userId, rawToken);
        if (row) {
          await revokeRefreshToken(row.id);
        }
      } catch {
        // Token invalid or expired — still clear the cookie
      }
    }

    reply.clearCookie('refreshToken', { path: '/auth' });
    return reply.send({ success: true });
  });
}
