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
import { tradeRoutes } from './routes/trades';
import { wsRoutes } from './routes/ws';
import { orderbookRoutes } from './routes/orderbook';
import { authenticate } from './middleware/authenticate';
import { engineService } from './services/engine';
import { publisher, subscriber } from './services/redis';
import { startPersistenceWorker } from './workers/persistence';
import { broadcast, sendToUser } from './services/ws-manager';

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
    // Reject bodies over 1 MB — guards against request body stuffing attacks
    bodyLimit: 1_048_576,
  });

  // ── Security headers ───────────────────────────────────────
  // Helmet sets: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection,
  // Strict-Transport-Security, and others on every response via onSend hook
  await fastify.register(helmet, {
    contentSecurityPolicy: config.NODE_ENV === 'production',
  });

  // ── CORS — restrict to known frontend origin ───────────────
  // Avoid wildcard (true) in all environments; browsers enforce this,
  // wildcard would also prevent credentials from being sent
  await fastify.register(cors, {
    origin: config.NODE_ENV === 'production'
      ? 'https://trading-exchange-simulator.vercel.app'
      : 'http://localhost:3000',
    credentials: true,
  });

  // ── Global rate limit + per-route overrides ────────────────
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    // Uniform error shape — callers can't distinguish our envelope from defaults
    errorResponseBuilder: (_req, context) => ({
      success: false,
      error: `Too many requests — retry in ${Math.ceil(context.ttl / 1000)}s`,
    }),
  });

  // ── Plugins ────────────────────────────────────────────────
  await fastify.register(cookie);

  // ── Routes ────────────────────────────────────────────────
  await fastify.register(authRoutes, { prefix: '/auth' });
  await fastify.register(accountRoutes, { prefix: '/account' });
  await fastify.register(orderRoutes, { prefix: '/orders' });
  await fastify.register(tradeRoutes, { prefix: '/trades' });
  await fastify.register(orderbookRoutes, { prefix: '/orderbook' });
  await fastify.register(wsRoutes);

  // Health check
  fastify.get('/health', async (_req, reply) => {
    return reply.send({ status: 'ok', uptime: process.uptime() });
  });

  // Protected test route
  fastify.get('/me', { preHandler: authenticate }, async (req, reply) => {
    return reply.send({ success: true, data: req.user });
  });

  // Dev-only: verify security headers are present on every response.
  // Use `curl -sI http://localhost:4000/security-check` to inspect headers.
  // Helmet adds headers in onSend, so they won't appear in reply.getHeaders()
  // inside the handler — check the actual HTTP response instead.
  if (config.NODE_ENV !== 'production') {
    fastify.get('/security-check', async (_req, reply) => {
      return reply.send({
        success: true,
        note: 'Run: curl -sI http://localhost:4000/security-check',
        expectedHeaders: {
          'x-content-type-options': 'nosniff',
          'x-frame-options': 'SAMEORIGIN',
          'x-xss-protection': '0',
          'strict-transport-security': 'max-age=15552000; includeSubDomains',
        },
      });
    });
  }

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
  engineService.start();

  engineService.on('TRADE', (event) => {
    fastify.log.info({ event }, 'Trade executed');
    publisher.publish(
      `market.trades.${event.symbol as string}`,
      JSON.stringify(event)
    ).catch((err) => fastify.log.error({ err }, 'Failed to publish TRADE'));
  });

  engineService.on('ORDER_UPDATE', (event) => {
    fastify.log.info({ event }, 'Order updated');
    const orderId = event.orderId as string;
    const userId = engineService.getOrderOwner(orderId);
    if (userId) {
      publisher.publish(
        `private.user.${userId}.orders`,
        JSON.stringify(event)
      ).catch((err) => fastify.log.error({ err }, 'Failed to publish ORDER_UPDATE'));
      const status = event.status as string;
      if (status === 'FILLED' || status === 'CANCELLED') {
        engineService.clearOrderOwner(orderId);
      }
    }
  });

  // ── Start persistence worker ───────────────────────────────
  await startPersistenceWorker();

  // ── WebSocket Redis bridge ─────────────────────────────────
  await subscriber.psubscribe('private.user.*.orders');

  subscriber.on('pmessage', (_pattern, channel, message) => {
    try {
      if (channel.startsWith('market.trades.')) {
        const symbol = channel.slice('market.trades.'.length);
        broadcast(
          `public:trades:${symbol}`,
          JSON.stringify({ channel: `public:trades:${symbol}`, data: JSON.parse(message) })
        );
      } else if (channel.startsWith('private.user.') && channel.endsWith('.orders')) {
        const userId = channel.slice('private.user.'.length, -'.orders'.length);
        sendToUser(
          userId,
          JSON.stringify({ channel: 'private:orders', data: JSON.parse(message) })
        );
      }
    } catch (err) {
      fastify.log.error({ err }, 'WS Redis bridge error');
    }
  });

  return fastify;
}
