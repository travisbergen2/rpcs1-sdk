import {
  issueAuthorizationCode,
  MCP_OAUTH_CLIENT_ID,
  MCP_OAUTH_REDIRECT_URI,
  MCP_OAUTH_SCOPE,
  validateAuthorizationRequest,
} from '@/lib/mcp-oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const securityHeaders = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https://hyperagent.com; base-uri 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function errorResponse(message: string, status = 400) {
  return new Response(`OAuth request rejected: ${message}`, {
    status,
    headers: {
      ...securityHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const error = validateAuthorizationRequest(params);
  if (error) return errorResponse(error);

  const hiddenFields = [...params.entries()]
    .map(([name, value]) => (
      `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`
    ))
    .join('');

  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authorize Hyperagent | RPCS1</title>
  <style>
    :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #030712; color: #e5e7eb; }
    main { width: min(32rem, calc(100% - 2rem)); padding: 2rem; border: 1px solid #374151; border-radius: 1rem; background: #111827; }
    h1 { margin-top: 0; color: white; }
    p, li { line-height: 1.6; color: #cbd5e1; }
    code { color: #7dd3fc; }
    button { width: 100%; margin-top: 1rem; padding: .8rem 1rem; border: 0; border-radius: .6rem; background: #0284c7; color: white; font-weight: 700; cursor: pointer; }
    small { display: block; margin-top: 1rem; color: #94a3b8; }
  </style>
</head>
<body>
  <main>
    <h1>Authorize Hyperagent</h1>
    <p>Hyperagent is requesting access to the public RPCS1 Agent Tuner MCP server.</p>
    <ul>
      <li>Client: <code>${MCP_OAUTH_CLIENT_ID}</code></li>
      <li>Scope: <code>${MCP_OAUTH_SCOPE}</code></li>
      <li>Permission: call the read-only <code>recommend_agent_configuration</code> tool</li>
    </ul>
    <form method="post" action="/oauth/authorize">
      ${hiddenFields}
      <button type="submit">Allow access</button>
    </form>
    <small>The authorization result returns only to ${MCP_OAUTH_REDIRECT_URI}.</small>
  </main>
</body>
</html>`, {
    headers: {
      ...securityHeaders,
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const params = new URLSearchParams();
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') params.append(key, value);
  }

  const error = validateAuthorizationRequest(params);
  if (error) return errorResponse(error);

  const code = await issueAuthorizationCode(params);
  const callback = new URL(MCP_OAUTH_REDIRECT_URI);
  callback.searchParams.set('code', code);

  const state = params.get('state');
  if (state) callback.searchParams.set('state', state);

  return Response.redirect(callback, 302);
}
