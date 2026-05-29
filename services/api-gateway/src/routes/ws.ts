import { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import { verifyAccessToken } from '../utils/token';
import { addConnection, removeConnection, subscribe } from '../services/ws-manager';

interface WsQuery {
  token?: string;
}

export async function wsRoutes(fastify: FastifyInstance): Promise<void> {
  // Register scoped to this plugin context so the main app isn't forced into WS mode
  await fastify.register(websocket);

  fastify.get<{ Querystring: WsQuery }>('/ws', { websocket: true }, (socket, req) => {
    const { token } = req.query;

    if (!token) {
      socket.close(1008, 'Missing token');
      return;
    }

    let user: { userId: string; email: string; role: string };
    try {
      user = verifyAccessToken(token);
    } catch {
      socket.close(1008, 'Invalid or expired token');
      return;
    }

    // Cast needed: @fastify/websocket and ws have compatible but distinct nominal types
    addConnection(user.userId, socket as unknown as import('ws').default);

    socket.send(JSON.stringify({ type: 'CONNECTED', userId: user.userId }));

    // Proxies and load balancers drop idle TCP connections — ping keeps the tunnel alive
    const heartbeat = setInterval(() => {
      if (socket.readyState === socket.OPEN) {
        socket.ping();
      }
    }, 30_000);

    socket.on('message', (raw: Buffer | string) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type?: unknown; channels?: unknown };

        if (msg.type !== 'SUBSCRIBE' || !Array.isArray(msg.channels)) return;

        const confirmed: string[] = [];
        for (const channel of msg.channels as string[]) {
          if (channel.startsWith('public:trades:')) {
            subscribe(channel, socket as unknown as import('ws').default);
            confirmed.push(channel);
          } else if (channel === 'private:orders') {
            // addConnection already registered this user — sendToUser routes to them directly
            confirmed.push(channel);
          }
        }

        socket.send(JSON.stringify({ type: 'SUBSCRIBED', channels: confirmed }));
      } catch {
        // Silently drop unparseable messages — don't expose error details to client
      }
    });

    socket.on('close', () => {
      clearInterval(heartbeat);
      removeConnection(user.userId, socket as unknown as import('ws').default);
    });

    socket.on('error', (err: Error) => {
      fastify.log.error({ err }, 'WebSocket error');
      clearInterval(heartbeat);
      removeConnection(user.userId, socket as unknown as import('ws').default);
    });
  });
}
