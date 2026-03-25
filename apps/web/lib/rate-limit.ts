import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

function createRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = createRedis();

/**
 * Rate limiter for lead/contact endpoints.
 * Max 5 requests per IP per hour.
 */
export const leadsLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      prefix: 'rl:leads',
      analytics: true,
    })
  : null;

/**
 * Rate limiter for survey submission.
 * Max 3 submissions per token (prevents duplicate submissions).
 */
export const submitLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(3, '1 h'),
      prefix: 'rl:submit',
      analytics: true,
    })
  : null;

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a given identifier.
 * Returns { limited: false } if Upstash is not configured (development fallback).
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<RateLimitResult> {
  if (!limiter) {
    return { limited: false, remaining: -1, reset: 0 };
  }

  const result = await limiter.limit(identifier);
  return {
    limited: !result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
