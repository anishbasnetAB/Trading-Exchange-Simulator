import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { FastifyError } from 'fastify';
import { config } from './config';
import { authRoutes } from './routes/auth';
import { accountRoutes } from './routes/account';
import { orderRoutes } from './routes/orders';
import { authenticate } from './middleware/authenticate';
import { engineService } from './services/engine';

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

  // ── Security ───────────────────────────────────────────────
  await fastify.register(helmet, {
    contentSecurityPolicy: config.NODE_ENV === 'production',
  });

  await fastify.register(cors, {
    origin: config.NODE_ENV === 'production' ? 'https://yourdomain.com' : true,
    credentials: true,
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // ── Plugins ────────────────────────────────────────────────
  await fastify.register(cookie);

  // ── Routes ────────────────────────────────────────────────
  await fastify.register(authRoutes, { prefix: '/auth' });
  await fastify.register(accountRoutes, { prefix: '/account' });
  await fastify.register(orderRoutes, { prefix: '/orders' });

  // Health check
  fastify.get('/health', async (_req, reply) => {
    return reply.send({ status: 'ok', uptime: process.uptime() });
  });

  // Protected test route
  fastify.get('/me', { preHandler: authenticate }, async (req, reply) => {
    return reply.send({ success: true, data: req.user });
  });

  // ── Error handlers ─────────────────────────────────────────
  fastify.setNotFoundHandler((_req, reply) => {
    reply.status(404).send({ success: false, error: 'Route not found' });
  });

  fastify.setErrorHandler((error: FastifyError, _req, reply) => {
    fastify.log.error(error);
    const message = config.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message;
    reply.status(error.statusCode ?? 500).send({ success: false, error: message });
  });

  // ── Start matching engine ──────────────────────────────────
  // Must be inside buildApp so fastify.log is available
  engineService.start();

  engineService.on('TRADE', (event) => {
    fastify.log.info({ event }, 'Trade executed');
  });

  engineService.on('ORDER_UPDATE', (event) => {
    fastify.log.info({ event }, 'Order updated');
  });

  return fastify;
}