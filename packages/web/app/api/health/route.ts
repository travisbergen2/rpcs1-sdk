import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'rpcs1-agent-tuner',
      mcp: {
        endpoint: '/mcp',
        transport: 'streamable-http',
        version: '0.3.0',
      },
      translator: {
        // Presence flag only — never the key. Distinguishes "no key in this
        // deployment" from "gateway failing" when engine reports 'rules'.
        model_backed: Boolean(process.env.AI_GATEWAY_API_KEY),
        model: process.env.AI_GATEWAY_API_KEY
          ? (process.env.RPCS1_GATEWAY_MODEL ?? 'openai/gpt-4o-mini')
          : null,
      },
      deployment: {
        id: process.env.VERCEL_DEPLOYMENT_ID ?? null,
        commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      },
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
