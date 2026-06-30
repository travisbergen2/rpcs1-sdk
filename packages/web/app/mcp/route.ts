import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createRpcs1McpServer } from '@/lib/mcp-server';
import { env } from '@/lib/env';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';
import { MCP_OAUTH_SCOPE, MCP_RESOURCE_URL, verifyMcpAccessToken } from '@/lib/mcp-oauth';

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

function oauthError(message: string) {
  return jsonRpcError(401, -32004, message, {
    'WWW-Authenticate':
      `Bearer error="invalid_token", error_description="${message}", ` +
      `scope="${MCP_OAUTH_SCOPE}", ` +
      `resource_metadata="https://rpcs1.dev/.well-known/oauth-protected-resource/mcp"`,
  });
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

function summarizeMcpPayload(payload: unknown): { rpcMethods: string[]; toolNames: string[] } {
  const messages = Array.isArray(payload) ? payload : [payload];
  const rpcMethods = new Set<string>();
  const toolNames = new Set<string>();

  for (const message of messages) {
    if (!message || typeof message !== 'object') continue;
    const record = message as { method?: unknown; params?: unknown };
    if (typeof record.method === 'string') rpcMethods.add(record.method);

    if (record.method === 'tools/call' && record.params && typeof record.params === 'object') {
      const params = record.params as { name?: unknown };
      if (typeof params.name === 'string') toolNames.add(params.name);
    }
  }

  return {
    rpcMethods: [...rpcMethods],
    toolNames: [...toolNames],
  };
}

async function handleMcpRequest(request: Request): Promise<Response> {
  const startedAt = Date.now();
  const requestId = request.headers.get('x-vercel-id') ?? crypto.randomUUID();
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  let parsedBody: unknown;
  let rawBody: string | undefined;

  if (!isAllowedHost(request)) {
    return jsonRpcError(403, -32001, 'Host is not allowed');
  }

  const authorization = request.headers.get('authorization');
  if (authorization) {
    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return oauthError('Invalid Authorization header');
    }

    try {
      const auth = await verifyMcpAccessToken(token);
      if (!auth.scopes.includes(MCP_OAUTH_SCOPE) || auth.resource !== MCP_RESOURCE_URL) {
        return oauthError('Token is not valid for this MCP resource');
      }
    } catch {
      return oauthError('Invalid or expired access token');
    }
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

    rawBody = await request.text();
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
  const transportRequest = normalizeTransportRequest(request, rawBody);

  await server.connect(transport);
  const response = await transport.handleRequest(transportRequest, { parsedBody });
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
  headers.set('X-Request-Id', requestId);

  console.info(JSON.stringify({
    event: 'mcp_request',
    requestId,
    method: request.method,
    ...summarizeMcpPayload(parsedBody),
    status: response.status,
    durationMs: Date.now() - startedAt,
  }));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function normalizeTransportRequest(request: Request, rawBody?: string): Request {
  const accept = request.headers.get('accept') ?? '';
  if (accept.includes('application/json') && accept.includes('text/event-stream')) {
    return request;
  }

  const headers = new Headers(request.headers);
  headers.set('accept', 'application/json, text/event-stream');

  if (request.method === 'POST') {
    return new Request(request.url, {
      method: request.method,
      headers,
      body: rawBody ?? '',
    });
  }

  return new Request(request.url, {
    method: request.method,
    headers,
  });
}

export const POST = handleMcpRequest;
export const DELETE = handleMcpRequest;

export function GET(request: Request) {
  const accept = request.headers.get('accept') ?? '';

  // For MCP Streamable HTTP session initialization, require MCP headers
  if (accept.includes('application/json')) {
    return handleMcpRequest(request);
  }

  if (accept.includes('text/html')) {
    return new Response(
      [
        'RPCS1 MCP server is online.',
        '',
        'MCP endpoint: https://rpcs1.dev/mcp',
        'Transport: Streamable HTTP',
        'Tools: recommend_agent_configuration, interpret, normalize, rewrite',
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

  return new Response('MCP endpoint is at https://rpcs1.dev/mcp. Use POST with MCP protocol headers.', {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
