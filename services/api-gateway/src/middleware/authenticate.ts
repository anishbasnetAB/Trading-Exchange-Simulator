import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../utils/token';

// Attach this to any route that requires authentication
// It reads the Bearer token, verifies it, and attaches the user to the request
export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ success: false, error: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify signature and expiry — throws if invalid
    const payload = verifyAccessToken(token!);
    req.user = payload; // attach user to request for downstream use
  } catch {
    return reply.status(401).send({ success: false, error: 'Invalid or expired token' });
  }
}