import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createUser, findUserByEmail } from '../db/users';
import { hashPassword, verifyPassword } from '../utils/hash';
import { signAccessToken, signRefreshToken } from '../utils/tokens';
import { ApiResponse } from '../types';

// Zod schemas — validate request body before touching any logic
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(fastify: FastifyInstance) {

  // POST /auth/register
  fastify.post('/register', async (req, reply) => {
    // Validate input — throw early if invalid
    const body = registerSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        error: body.error.flatten().fieldErrors,
      });
    }

    const { email, password } = body.data;

    // Check if email already exists
    const existing = await findUserByEmail(email);
    if (existing) {
      return reply.status(409).send({
        success: false,
        error: 'Email already registered',
      });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser(email, passwordHash);

    const response: ApiResponse = {
      success: true,
      data: { id: user.id, email: user.email, role: user.role },
    };

    return reply.status(201).send(response);
  });

  // POST /auth/login
  fastify.post('/login', async (req, reply) => {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid input',
      });
    }

    const { email, password } = body.data;

    const user = await findUserByEmail(email);

    // Always run verifyPassword even if user not found
    // This prevents timing attacks — attacker can't tell if email exists
    // by measuring response time
    const dummyHash = '$2b$12$invalidhashfortimingnormalisation000000000000000000000';
    const passwordMatch = user
      ? await verifyPassword(password, user.password_hash)
      : await verifyPassword(password, dummyHash);

    if (!user || !passwordMatch) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid email or password',
      });
    }

    if (user.status !== 'ACTIVE') {
      return reply.status(403).send({
        success: false,
        error: 'Account is suspended',
      });
    }

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Send refresh token as httpOnly cookie
    // httpOnly = JavaScript cannot read it — XSS attacks can't steal it
    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false, // set true in production (HTTPS only)
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    });

    return reply.send({
      success: true,
      data: {
        accessToken,
        user: { id: user.id, email: user.email, role: user.role },
      },
    });
  });
}