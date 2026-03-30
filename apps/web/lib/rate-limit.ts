import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

function createRedis(): Redis | null {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

let _redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  _redis = createRedis();
  return _redis;
}

let _leadsLimiter: Ratelimit | null | undefined;
let _submitLimiter: Ratelimit | null | undefined;

export function getLeadsLimiter(): Ratelimit | null {
  if (_leadsLimiter !== undefined) return _leadsLimiter;
  const r = getRedis();
  if (!r) return (_leadsLimiter = null);
  return (_leadsLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'rl:leads',
    analytics: true,
  }));
}

export function getSubmitLimiter(): Ratelimit | null {
  if (_submitLimiter !== undefined) return _submitLimiter;
  const r = getRedis();
  if (!r) return (_submitLimiter = null);
  return (_submitLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.fixedWindow(3, '1 h'),
    prefix: 'rl:submit',
    analytics: true,
  }));
}

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  reset: number;
}

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
