import { NextRequest, NextResponse } from 'next/server';
import { recommend } from '@rpcs1/core';
import type { RecommendInput } from '@rpcs1/core';
import { getLicenseFromRequest } from '@/lib/license';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as RecommendInput;

    // Validate required fields exist
    if (!body?.task?.task_summary || !body?.environment || !body?.target_platform) {
      return NextResponse.json(
        { error: 'Missing required fields: task.task_summary, environment, target_platform' },
        { status: 400 },
      );
    }

    // Check for paid license key — bypasses rate limit
    const license = await getLicenseFromRequest(req);
    if (!license) {
      // Free tier: rate limit by IP
      const ip = getClientIp(req);
      const { allowed, remaining } = checkRateLimit(ip);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Free tier allows 10 requests per hour. See /pricing for unlimited access.' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit':     '10',
              'X-RateLimit-Remaining': '0',
              'Retry-After':           '3600',
            },
          },
        );
      }

      // Free tier: only basic platform outputs (no export features)
      const result = recommend(body);
      return NextResponse.json(result, {
        headers: {
          'X-RateLimit-Remaining': String(remaining),
          'X-Tier': 'free',
        },
      });
    }

    // Paid tier: full output
    const result = recommend(body);
    return NextResponse.json(result, {
      headers: { 'X-Tier': license.tier },
    });
  } catch (err) {
    console.error('[/api/recommend]', err);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}
