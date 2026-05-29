import { z } from 'zod';

// Define the shape and rules for all environment variables
// If anything is missing or wrong, we crash at startup — not silently later
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('4000').transform(Number), // transform: string → number
  HOST: z.string().default('0.0.0.0'),
  POSTGRES_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),  // enforce minimum secret length
  JWT_REFRESH_SECRET: z.string().min(32),
});

// safeParse returns { success, data, error } instead of throwing
const result = envSchema.safeParse(process.env);

if (!result.success) {
  // Show exactly which variables are missing/wrong, then exit
  console.error('Invalid environment config:');
  console.error(result.error.flatten().fieldErrors);
  process.exit(1); // crash loudly — don't run with broken config
}

export const config = result.data;