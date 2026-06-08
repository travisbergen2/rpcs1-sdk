import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createRpcs1McpServer } from '@/lib/mcp-server';
import { env } from '@/lib/env';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Accept, Authorization, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID',
  'Access-Control-Expose-Headers': 'MCP-Protocol-Version, MCP-Session-Id',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

function jsonRpcError(status: number, code: number, message: string, headers?: HeadersInit) {
  return Response.json(
    {
      jsonrpc: '2.0',
      id: null,
      error: { code, message },
    },
    {
      status,
      headers: {
        ...corsHeaders,
        ...headers,
      },
    },
  );
}

function isAllowedHost(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true;

  const configuredHosts = env.MCP_ALLOWED_HOSTS
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  const vercelHosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].filter((host): host is string => Boolean(host));
  const allowedHosts = new Set([...configuredHosts, ...vercelHosts]);
  const requestHost = (request.headers.get('host') ?? new URL(request.url).host)
    .split(':')[0]
    .toLowerCase();

  return allowedHosts.has(requestHost);
}

async function handleMcpRequest(request: Request): Promise<Response> {
  const startedAt = Date.now();
  const requestId = request.headers.get('x-vercel-id') ?? crypto.randomUUID();
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  let parsedBody: unknown;

  if (!isAllowedHost(request)) {
    return jsonRpcError(403, -32001, 'Host is not allowed');
  }

  if (
    request.method === 'POST' &&
    (Number.isNaN(contentLength) || contentLength > env.MCP_MAX_BODY_BYTES)
  ) {
    return jsonRpcError(413, -32002, 'Request body is too large');
  }

  if (request.method === 'POST') {
    const rateLimit = checkRateLimit(getClientIp(request), {
      limit: env.MCP_HOURLY_LIMIT,
      namespace: 'mcp',
    });

    if (!rateLimit.allowed) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
      return jsonRpcError(429, -32003, 'MCP request limit exceeded', {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(env.MCP_HOURLY_LIMIT),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
      });
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > env.MCP_MAX_BODY_BYTES) {
      return jsonRpcError(413, -32002, 'Request body is too large');
    }

    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return jsonRpcError(400, -32700, 'Invalid JSON');
    }
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });
  const server = createRpcs1McpServer();

  await server.connect(transport);
  const response = await transport.handleRequest(request, { parsedBody });
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
  headers.set('X-Request-Id', requestId);

  console.info(JSON.stringify({
    event: 'mcp_request',
    requestId,
    method: request.method,
    status: response.status,
    durationMs: Date.now() - startedAt,
  }));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const POST = handleMcpRequest;
export const DELETE = handleMcpRequest;

export function GET(request: Request) {
  const accept = request.headers.get('accept') ?? '';

  if (accept.includes('text/html')) {
    return new Response(
      [
        'RPCS1 MCP server is online.',
        '',
        'MCP endpoint: https://rpcs1.dev/mcp',
        'Transport: Streamable HTTP',
        'Tool: recommend_agent_configuration',
        '',
        'Connect this URL from an MCP-compatible client.',
        'Health: https://rpcs1.dev/api/health',
        'Docs: https://rpcs1.dev/docs',
      ].join('\n'),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain; charset=utf-8',
        },
      },
    );
  }

  return handleMcpRequest(request);
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
