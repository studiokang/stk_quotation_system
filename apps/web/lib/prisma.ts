import { PrismaClient } from '@repo/db';
import { logger } from '@/lib/logger';

const QUERY_TIMEOUT = 5_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  });
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Singleton Prisma client — 지연 초기화로 `next build` 시 라우트 번들만 로드될 때
 * DATABASE_URL 없이도 모듈 평가가 실패하지 않도록 함.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    return Reflect.get(client, prop, client);
  },
});

/**
 * Execute a database operation with timeout and automatic retry on transient failures.
 * Retries up to MAX_RETRIES times with exponential backoff.
 */
export async function withDbResilience<T>(
  operation: () => Promise<T>,
  label = 'db-operation',
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`DB query timeout (${QUERY_TIMEOUT}ms)`)), QUERY_TIMEOUT),
        ),
      ]);
      return result;
    } catch (err) {
      lastError = err;
      const isRetryable = isTransientError(err);

      logger.warn(
        { label, attempt, maxRetries: MAX_RETRIES, retryable: isRetryable, error: String(err) },
        'Database operation failed',
      );

      if (!isRetryable || attempt === MAX_RETRIES) break;

      await sleep(RETRY_DELAY_MS * Math.pow(2, attempt - 1));
    }
  }

  throw lastError;
}

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('connection') ||
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('server has closed the connection')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Safely extract a user-facing message from a database error.
 * Never exposes internal Prisma error details.
 */
export function safeDbError(err: unknown): string {
  if (err instanceof Error && err.message.includes('timeout')) {
    return '요청 처리 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.';
  }
  return '데이터 처리 중 오류가 발생했습니다.';
}
