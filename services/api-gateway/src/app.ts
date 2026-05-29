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

    // Broadcast to symbol channel — persistence worker and future websocket
    // gateway both subscribe here
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

      // Free the map entry once the order reaches a terminal state
      const status = event.status as string;
      if (status === 'FILLED' || status === 'CANCELLED') {
        engineService.clearOrderOwner(orderId);
      }
    }
  });

  // ── Start persistence worker ───────────────────────────────
  // Subscribes to market.trades.* and writes every trade + positions to Postgres
  await startPersistenceWorker();

  // ── WebSocket Redis bridge ─────────────────────────────────
  // The persistence worker already subscribed to market.trades.* on this connection.
  // We add private.user.*.orders here so order status reaches connected clients.
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
        // Strip 'private.user.' prefix and '.orders' suffix to get the UUID
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