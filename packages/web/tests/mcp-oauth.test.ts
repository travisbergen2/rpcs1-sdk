import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { GET as authorizeGet, POST as authorizePost } from '../app/oauth/authorize/route';
import { POST as tokenPost } from '../app/oauth/token/route';
import { GET as authorizationMetadataGet } from '../app/.well-known/oauth-authorization-server/route';
import { GET as resourceMetadataGet } from '../app/.well-known/oauth-protected-resource/mcp/route';
import {
  MCP_OAUTH_CLIENT_ID,
  MCP_OAUTH_REDIRECT_URI,
  MCP_OAUTH_SCOPE,
  MCP_RESOURCE_URL,
} from '../lib/mcp-oauth';

const verifier = 'rpcs1-hyperagent-test-verifier-0123456789-abcdefghijklmnopqrstuvwxyz';
const challenge = createHash('sha256').update(verifier).digest('base64url');

function authorizationParams() {
  return new URLSearchParams({
    response_type: 'code',
    client_id: MCP_OAUTH_CLIENT_ID,
    redirect_uri: MCP_OAUTH_REDIRECT_URI,
    scope: MCP_OAUTH_SCOPE,
    state: 'test-state',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    resource: MCP_RESOURCE_URL,
  });
}

async function authorize() {
  const params = authorizationParams();
  const response = await authorizePost(new Request('http://localhost/oauth/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  }));
  const callback = new URL(response.headers.get('location')!);

  return {
    response,
    callback,
    code: callback.searchParams.get('code')!,
  };
}

describe('RPCS1 Hyperagent OAuth compatibility', () => {
  it('publishes authorization and protected-resource metadata', async () => {
    const authorizationMetadata = await authorizationMetadataGet();
    const resourceMetadata = await resourceMetadataGet();

    expect(await authorizationMetadata.json()).toMatchObject({
      issuer: 'https://rpcs1.dev',
      authorization_endpoint: 'https://rpcs1.dev/oauth/authorize',
      token_endpoint: 'https://rpcs1.dev/oauth/token',
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
    });
    expect(await resourceMetadata.json()).toMatchObject({
      resource: MCP_RESOURCE_URL,
      authorization_servers: ['https://rpcs1.dev'],
      scopes_supported: [MCP_OAUTH_SCOPE],
    });
  });

  it('renders consent only for the registered Hyperagent callback', async () => {
    const valid = await authorizeGet(new Request(
      `http://localhost/oauth/authorize?${authorizationParams()}`,
    ));
    expect(valid.status).toBe(200);
    expect(valid.headers.get('content-security-policy')).toContain(
      "form-action 'self' https://hyperagent.com",
    );
    expect(await valid.text()).toContain('Authorize Hyperagent');

    const invalidParams = authorizationParams();
    invalidParams.set('redirect_uri', 'https://attacker.example/callback');
    const invalid = await authorizeGet(new Request(
      `http://localhost/oauth/authorize?${invalidParams}`,
    ));
    expect(invalid.status).toBe(400);
  });

  it('exchanges a consented authorization code with PKCE', async () => {
    const { response, callback, code } = await authorize();

    expect(response.status).toBe(302);
    expect(callback.origin + callback.pathname).toBe(MCP_OAUTH_REDIRECT_URI);
    expect(callback.searchParams.get('state')).toBe('test-state');

    const tokenResponse = await tokenPost(new Request('http://localhost/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: MCP_OAUTH_CLIENT_ID,
        redirect_uri: MCP_OAUTH_REDIRECT_URI,
        code_verifier: verifier,
      }),
    }));
    const token = await tokenResponse.json();

    expect(tokenResponse.status).toBe(200);
    expect(token).toMatchObject({
      token_type: 'Bearer',
      expires_in: 3600,
      scope: MCP_OAUTH_SCOPE,
    });
    expect(token.access_token).toEqual(expect.any(String));

    const replay = await tokenPost(new Request('http://localhost/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: MCP_OAUTH_CLIENT_ID,
        redirect_uri: MCP_OAUTH_REDIRECT_URI,
        code_verifier: verifier,
      }),
    }));
    expect(replay.status).toBe(400);
    expect(await replay.json()).toMatchObject({ error: 'invalid_grant' });
  });

  it('rejects an incorrect PKCE verifier', async () => {
    const { code } = await authorize();
    const response = await tokenPost(new Request('http://localhost/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: MCP_OAUTH_CLIENT_ID,
        redirect_uri: MCP_OAUTH_REDIRECT_URI,
        code_verifier: 'incorrect-verifier',
      }),
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'invalid_grant' });
  });
});
