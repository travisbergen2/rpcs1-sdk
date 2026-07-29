import { describe, expect, it } from 'vitest';
import { GET, OPTIONS, POST } from '../app/mcp/route';
import { createHash } from 'node:crypto';
import {
  exchangeAuthorizationCode,
  issueAuthorizationCode,
  MCP_OAUTH_CLIENT_ID,
  MCP_OAUTH_REDIRECT_URI,
  MCP_OAUTH_SCOPE,
  MCP_RESOURCE_URL,
} from '../lib/mcp-oauth';

const headers = {
  Accept: 'application/json, text/event-stream',
  'Content-Type': 'application/json',
  'MCP-Protocol-Version': '2025-11-25',
};

describe('RPCS1 MCP HTTP route', () => {
  it('returns 405 for GET because this server does not offer a standalone SSE stream', async () => {
    const response = await GET(new Request('http://localhost/mcp', {
      headers: { Accept: 'text/event-stream' },
    }));

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST, DELETE, OPTIONS');
  });

  it('accepts a same-origin CORS preflight without opening the endpoint to other origins', async () => {
    const response = await OPTIONS(new Request('http://localhost/mcp', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost',
        'Access-Control-Request-Method': 'POST',
      },
    }));

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost');
  });

  it('rejects a cross-origin MCP request that is not explicitly allowed', async () => {
    const response = await POST(new Request('http://localhost/mcp', {
      method: 'POST',
      headers: {
        ...headers,
        Origin: 'https://untrusted.example',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 0,
        method: 'tools/list',
        params: {},
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toMatchObject({ code: -32005, message: 'Origin is not allowed' });
  });

  it('handles MCP initialization over Streamable HTTP', async () => {
    const response = await POST(new Request('http://localhost/mcp', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'route-test', version: '1.0.0' },
        },
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(body.result.serverInfo).toMatchObject({
      name: 'rpcs1-agent-tuner',
      version: '0.4.0',
    });
  });

  it('accepts JSON-only clients when JSON responses are enabled', async () => {
    const response = await POST(new Request('http://localhost/mcp', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.tools[0]).toMatchObject({
      name: 'recommend_agent_configuration',
    });
  });

  it('rejects malformed JSON before it reaches the MCP transport', async () => {
    const response = await POST(new Request('http://localhost/mcp', {
      method: 'POST',
      headers,
      body: '{not-json',
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatchObject({
      code: -32700,
      message: 'Invalid JSON',
    });
  });

  it('rejects bodies larger than the configured maximum', async () => {
    const response = await POST(new Request('http://localhost/mcp', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        padding: 'x'.repeat(70_000),
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.error).toMatchObject({
      code: -32002,
      message: 'Request body is too large',
    });
  });

  it('accepts a valid Hyperagent bearer token', async () => {
    const codeVerifier = 'valid-route-test-verifier-0123456789-abcdefghijklmnopqrstuvwxyz';
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    const code = await issueAuthorizationCode(new URLSearchParams({
      response_type: 'code',
      client_id: MCP_OAUTH_CLIENT_ID,
      redirect_uri: MCP_OAUTH_REDIRECT_URI,
      scope: MCP_OAUTH_SCOPE,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      resource: MCP_RESOURCE_URL,
    }));
    const { accessToken } = await exchangeAuthorizationCode({
      code,
      clientId: MCP_OAUTH_CLIENT_ID,
      redirectUri: MCP_OAUTH_REDIRECT_URI,
      codeVerifier,
    });

    const response = await POST(new Request('http://localhost/mcp', {
      method: 'POST',
      headers: {
        ...headers,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'hyperagent-route-test', version: '1.0.0' },
        },
      }),
    }));

    expect(response.status).toBe(200);
  });

  it('rejects an invalid bearer token with OAuth discovery metadata', async () => {
    const response = await POST(new Request('http://localhost/mcp', {
      method: 'POST',
      headers: {
        ...headers,
        Authorization: 'Bearer invalid-token',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/list',
      }),
    }));

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain(
      'resource_metadata="https://rpcs1.dev/.well-known/oauth-protected-resource/mcp"',
    );
  });
});
