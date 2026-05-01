import type { NextRequest } from 'next/server';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix?: string;
};

export type RateLimitResult = {
  isLimited: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const FALLBACK_IP = 'unknown-ip';
const RATE_LIMIT_STORE = new Map<string, Bucket>();

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return FALLBACK_IP;
}

export function checkRateLimit(request: NextRequest, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const key = `${options.keyPrefix ?? 'global'}:${getClientIp(request)}`;
  const currentBucket = RATE_LIMIT_STORE.get(key);

  if (!currentBucket || currentBucket.resetAt <= now) {
    const resetAt = now + options.windowMs;
    RATE_LIMIT_STORE.set(key, { count: 1, resetAt });

    return {
      isLimited: false,
      limit: options.max,
      remaining: Math.max(options.max - 1, 0),
      resetAt,
    };
  }

  const nextCount = currentBucket.count + 1;
  currentBucket.count = nextCount;
  RATE_LIMIT_STORE.set(key, currentBucket);

  const remaining = Math.max(options.max - nextCount, 0);

  return {
    isLimited: nextCount > options.max,
    limit: options.max,
    remaining,
    resetAt: currentBucket.resetAt,
  };
}