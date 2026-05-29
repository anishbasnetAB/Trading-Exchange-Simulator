import pino from 'pino';
import { config } from './config';

export const logger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',

  // Pretty print in dev, raw JSON in production (machines parse JSON)
  transport: config.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }
    : undefined,

  // Every log line includes these automatically
  base: { service: 'api-gateway' },

  // Never log these fields — they contain secrets
  redact: {
    paths: ['*.password', '*.token', 'req.headers.authorization'],
    censor: '[redacted]',
  },
});