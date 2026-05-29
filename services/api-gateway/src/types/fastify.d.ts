import { AuthUser } from './index';

// Extends Fastify's built-in Request type
// After auth middleware runs, req.user is available on every protected route
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}