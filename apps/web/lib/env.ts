import { z } from 'zod';

/** 빈 문자열은 미설정과 동일하게 취급 (process.env / Vercel 에서 "" 로 올 때) */
function emptyToUndefined(v: unknown) {
  return v === '' ? undefined : v;
}

const envSchema = z.object({
  // —— 서버 전용 (비밀) ——
  DATABASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().url('DATABASE_URL must be a valid connection string (postgresql://...)'),
  ),
  JWT_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ),
  /** NextAuth 도입 시 필수로 쓰려면 Vercel/로컬에 설정 */
  NEXTAUTH_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters').optional(),
  ),
  /** 이메일 미사용 시 비워두면 검증 통과; 런타임에서 발송 생략 */
  RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  EMAIL_FROM: z.preprocess(
    emptyToUndefined,
    z.string().min(1).default('onboarding@studiokang.ai'),
  ),
  /** POST /api/quote/generate — 서버 간 호출 시 `x-internal-quote-secret` 과 동일해야 함 (min 32자) */
  INTERNAL_QUOTE_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(32, 'INTERNAL_QUOTE_SECRET must be at least 32 characters'),
  ),

  // —— 클라이언트에 노출 (NEXT_PUBLIC_*) ——
  NEXT_PUBLIC_BASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().url('NEXT_PUBLIC_BASE_URL must be a valid URL'),
  ),
  /** Supabase 브라우저 클라이언트 — Settings → API */
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL (e.g. https://xxx.supabase.co)'),
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required (anon public key from Supabase)'),
  ),

  UPSTASH_REDIS_REST_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  UPSTASH_REDIS_REST_TOKEN: z.preprocess(emptyToUndefined, z.string().min(1).optional()),

  /** 미설정·빈 값·false → 비활성, true/1/yes → 활성 */
  USE_AI_QUOTE: z.preprocess(
    (v) => {
      if (v === '' || v === undefined) return false;
      const s = String(v).toLowerCase().trim();
      return s === 'true' || s === '1' || s === 'yes';
    },
    z.boolean(),
  ),
});

export type Env = z.infer<typeof envSchema>;

function logEnvValidationIssues(error: z.ZodError) {
  for (const issue of error.issues) {
    const path = issue.path.length ? issue.path.join('.') : '(root)';
    console.error(`[env] Invalid: ${path} — ${issue.message}`);
  }
}

function shouldSkipEnvValidation(): boolean {
  return (
    process.env.SKIP_ENV_VALIDATION === 'true' ||
    process.env.NEXT_PHASE === 'phase-production-build' ||
    (process.env.NODE_ENV === 'production' &&
      typeof window === 'undefined' &&
      !process.env.DATABASE_URL)
  );
}

function createEnv(): Env {
  if (shouldSkipEnvValidation()) {
    return process.env as unknown as Env;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    logEnvValidationIssues(parsed.error);
    const summary = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    console.error('Environment validation failed — fields:', summary);
    throw new Error(`Invalid environment variables — check server logs (${summary})`);
  }

  return parsed.data;
}

/** 검증된 환경 변수. `process.env` 직접 사용 대신 이 객체를 import 하세요. */
export const env = createEnv();
