import { z } from 'zod';

/** 빈 문자열은 미설정과 동일하게 취급 (process.env 에서 "" 로 올 때) */
function emptyToUndefined(v: unknown) {
  return v === '' ? undefined : v;
}

const envSchema = z.object({
  // —— 서버 전용 (비밀) ——
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  /** NextAuth 도입 시 필수로 쓰려면 Vercel/로컬에 설정 */
  NEXTAUTH_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters').optional(),
  ),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  EMAIL_FROM: z.string().min(1).default('onboarding@studiokang.ai'),

  // —— 클라이언트에 노출 (NEXT_PUBLIC_*) ——
  NEXT_PUBLIC_BASE_URL: z.string().url('NEXT_PUBLIC_BASE_URL must be a valid URL'),
  /** Supabase 브라우저 클라이언트 — Settings → API */
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL (e.g. https://xxx.supabase.co)'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required (anon public key from Supabase)'),

  USE_AI_QUOTE: z.enum(['true', 'false']).default('false'),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

function createEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.flatten().fieldErrors;
    console.error('Invalid environment variables:', JSON.stringify(formatted));
    throw new Error('Invalid environment variables — check server logs');
  }

  return parsed.data;
}

/** 검증된 환경 변수. `process.env` 직접 사용 대신 이 객체를 import 하세요. */
export const env = createEnv();
