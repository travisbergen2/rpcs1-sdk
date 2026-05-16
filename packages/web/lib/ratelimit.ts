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

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(ip);
  const limit = env.FREE_TIER_HOURLY_LIMIT;

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count++;
  return { allowed: true, remaining: limit - bucket.count };
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
