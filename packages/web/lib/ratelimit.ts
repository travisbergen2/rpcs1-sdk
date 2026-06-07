/**
 * Simple in-memory rate limiter for the free tier.
 *
 * MVP: in-process Map (resets on cold start). Good enough for Vercel Edge Functions.
 * Phase 3+: replace with Upstash Redis for persistence across instances.
 *
 * Limit: FREE_TIER_HOURLY_LIMIT requests per IP per hour.
 */

import { env } from './env';

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface RateLimitOptions {
  limit?: number;
  namespace?: string;
  windowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  ip: string,
  {
    limit = env.FREE_TIER_HOURLY_LIMIT,
    namespace = 'api',
    windowMs = WINDOW_MS,
  }: RateLimitOptions = {},
): RateLimitResult {
  const now = Date.now();
  const key = `${namespace}:${ip}`;
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.windowStart + windowMs };
  }

  bucket.count++;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    resetAt: bucket.windowStart + windowMs,
  };
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
