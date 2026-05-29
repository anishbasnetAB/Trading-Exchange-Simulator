import { Pool } from 'pg';
import { config } from '../config';

// Pool = multiple reusable connections
// Never create a new connection per request — too slow
// Pool manages a set of connections and hands them out as needed
export const db = new Pool({
  connectionString: config.POSTGRES_URL,
  max: 20,                // maximum connections in the pool
  idleTimeoutMillis: 30000,   // close idle connections after 30s
  connectionTimeoutMillis: 5000, // fail fast if can't connect in 5s
});

// Test connection on startup
db.on('error', (err) => {
  console.error('Postgres pool error:', err);
  process.exit(1);
});