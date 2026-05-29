import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { FastifyError } from 'fastify';
import { authRoutes } from './routes/auth';
import cookie from '@fastify/cookie';
import { authenticate } from './middleware/authenticate';

export async function buildApp() {
    const fastify = Fastify({
        logger: {
            level: config.NODE_ENV === 'production' ? 'info' : 'debug',
            transport: config.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }
            : undefined,
            redact: {
            paths: ['*.password', '*.token', 'req.headers.authorization'],
            censor: '[redacted]',
            },
        },
        trustProxy: true,
    });

  // Security headers on every response (XSS, clickjacking, HSTS etc.)
  await fastify.register(helmet, {
    contentSecurityPolicy: config.NODE_ENV === 'production',
  });

  // Only allow our frontend to call this API
  await fastify.register(cors, {
    origin: config.NODE_ENV === 'production' ? 'https://yourdomain.com' : true,
    credentials: true, // allow cookies and auth headers cross-origin
  });

  // register cookie plugin before auth routes
await fastify.register(cookie);

// register auth routes under /auth prefix
await fastify.register(authRoutes, { prefix: '/auth' });

  // 100 requests per minute per IP — prevents brute force
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Health check route — Docker and load balancers call this
  fastify.get('/health', async (_req, reply) => {
    return reply.send({ status: 'ok', uptime: process.uptime() });
  });


  // Protected test route — remove this after testing
    fastify.get('/me', { preHandler: authenticate }, async (req, reply) => {
    return reply.send({ success: true, data: req.user });
    });
  // 404 handler for any route that doesn't exist
  fastify.setNotFoundHandler((_req, reply) => {
    reply.status(404).send({ success: false, error: 'Route not found' });
  });


    // Global error handler — all unhandled errors land here
    fastify.setErrorHandler((error: FastifyError, _req, reply) => {
    fastify.log.error(error);

    // Never expose internal error details to the client in production
    const message = config.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message;

    reply.status(error.statusCode ?? 500).send({ success: false, error: message });
    });

  return fastify;

  
}

