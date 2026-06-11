import { describe, expect, it } from 'vitest';
import { GET, POST } from '../app/mcp/route';
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
  it('shows a useful status message when opened in a browser', async () => {
    const response = await GET(new Request('http://localhost/mcp', {
      headers: { Accept: 'text/html' },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(await response.text()).toContain('RPCS1 MCP server is online');
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
      version: '0.2.0',
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
