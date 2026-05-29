import Redis from 'ioredis';
import { config } from '../config';

function createClient(label: string): Redis {
  const client = new Redis(config.REDIS_URL, {
    // null = retry forever on disconnect — essential for long-lived pub/sub
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  client.on('error', (err: Error) => {
    console.error(`Redis [${label}] error: ${err.message}`);
  });

  client.on('reconnecting', () => {
    console.warn(`Redis [${label}] reconnecting...`);
  });

  client.on('ready', () => {
    console.log(`Redis [${label}] ready`);
  });

  return client;
}

// Redis requires separate TCP connections for pub and sub:
// once a connection enters subscribe mode it can only receive messages
export const publisher = createClient('publisher');
export const subscriber = createClient('subscriber');
