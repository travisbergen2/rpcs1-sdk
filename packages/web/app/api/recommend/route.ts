import { NextRequest, NextResponse } from 'next/server';
import { recommend } from '@rpcs1/core';
import type { RecommendInput } from '@rpcs1/core';
import { getLicenseFromRequest } from '@/lib/license';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';
import { recommendInputSchema } from '@/lib/recommend-schema';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const parsed = recommendInputSchema.safeParse(await req.json());
    if (!parsed.success) {
      console.info('[recommend]', {
        event: 'recommend_rejected',
        requestId,
        status: 400,
        durationMs: Date.now() - startedAt,
        reason: 'invalid_body',
      });
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }
    const body: RecommendInput = parsed.data;

    // Check for paid license key — bypasses rate limit
    const license = await getLicenseFromRequest(req);
    if (!license) {
      // Free tier: rate limit by IP
      const ip = getClientIp(req);
      const { allowed, remaining } = checkRateLimit(ip);
      if (!allowed) {
        console.info('[recommend]', {
          event: 'recommend_rejected',
          requestId,
          status: 429,
          durationMs: Date.now() - startedAt,
          reason: 'rate_limit',
          platform: body.target_platform,
          tier: 'free',
        });
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
      console.info('[recommend]', {
        event: 'recommend_completed',
        requestId,
        status: 200,
        durationMs: Date.now() - startedAt,
        platform: body.target_platform,
        domainProvided: Boolean(body.task.domain),
        presetLike: ['customer_support', 'coding', 'research'].includes(body.task.domain ?? ''),
        tier: 'free',
        regime: result.predicted_regime,
      });
      return NextResponse.json(result, {
        headers: {
          'X-RateLimit-Remaining': String(remaining),
          'X-Tier': 'free',
        },
      });
    }

    // Paid tier: full output
    const result = recommend(body);
    console.info('[recommend]', {
      event: 'recommend_completed',
      requestId,
      status: 200,
      durationMs: Date.now() - startedAt,
      platform: body.target_platform,
      domainProvided: Boolean(body.task.domain),
      tier: license.tier,
      regime: result.predicted_regime,
    });
    return NextResponse.json(result, {
      headers: { 'X-Tier': license.tier },
    });
  } catch (err) {
    console.error('[recommend]', {
      event: 'recommend_failed',
      requestId,
      status: 400,
      durationMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : 'unknown_error',
    });
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}
