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
        version: '0.2.1',
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
