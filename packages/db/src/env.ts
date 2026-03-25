import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  NEXT_PUBLIC_BASE_URL: z.string().url('NEXT_PUBLIC_BASE_URL must be a valid URL'),
});

export type Env = z.infer<typeof envSchema>;

/** Validate and parse environment variables. Throws on failure. */
export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment variables:', JSON.stringify(parsed.error.flatten().fieldErrors));
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

export const env = validateEnv();
