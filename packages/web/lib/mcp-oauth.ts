import { createHash, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env } from './env';

export const MCP_OAUTH_CLIENT_ID = 'hyperagent-rpcs1';
export const MCP_OAUTH_REDIRECT_URI = 'https://hyperagent.com/api/mcp-servers/callback';
export const MCP_OAUTH_SCOPE = 'mcp:tools';
export const MCP_RESOURCE_URL = 'https://rpcs1.dev/mcp';
export const MCP_OAUTH_ISSUER = 'https://rpcs1.dev';

const AUTHORIZATION_CODE_AUDIENCE = 'rpcs1-oauth-token';
const AUTHORIZATION_CODE_TTL_SECONDS = 120;
const ACCESS_TOKEN_TTL_SECONDS = 3600;
const consumedAuthorizationCodes = new Map<string, number>();

type AuthorizationCodeClaims = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
  resource: string;
};

export type McpAccessToken = {
  clientId: string;
  scopes: string[];
  expiresAt: number;
  resource: string;
};

function secret(): Uint8Array {
  return new TextEncoder().encode(env.MCP_OAUTH_JWT_SECRET);
}

export function validateAuthorizationRequest(params: URLSearchParams): string | null {
  if (params.get('response_type') !== 'code') return 'response_type must be code';
  if (params.get('client_id') !== MCP_OAUTH_CLIENT_ID) return 'Unknown client_id';
  if (params.get('redirect_uri') !== MCP_OAUTH_REDIRECT_URI) return 'Invalid redirect_uri';
  if (params.get('code_challenge_method') !== 'S256') return 'PKCE S256 is required';
  if (!params.get('code_challenge')) return 'code_challenge is required';

  const requestedScopes = (params.get('scope') ?? MCP_OAUTH_SCOPE)
    .split(/\s+/)
    .filter(Boolean);
  if (requestedScopes.length !== 1 || requestedScopes[0] !== MCP_OAUTH_SCOPE) {
    return `scope must be ${MCP_OAUTH_SCOPE}`;
  }

  const resource = params.get('resource');
  if (resource && resource !== MCP_RESOURCE_URL) return 'Invalid resource';

  return null;
}

export async function issueAuthorizationCode(params: URLSearchParams): Promise<string> {
  const claims: AuthorizationCodeClaims = {
    clientId: MCP_OAUTH_CLIENT_ID,
    redirectUri: MCP_OAUTH_REDIRECT_URI,
    codeChallenge: params.get('code_challenge')!,
    scope: MCP_OAUTH_SCOPE,
    resource: params.get('resource') ?? MCP_RESOURCE_URL,
  };

  return new SignJWT({ ...claims, tokenUse: 'authorization_code' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(MCP_OAUTH_ISSUER)
    .setAudience(AUTHORIZATION_CODE_AUDIENCE)
    .setSubject(MCP_OAUTH_CLIENT_ID)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${AUTHORIZATION_CODE_TTL_SECONDS}s`)
    .sign(secret());
}

function pkceChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url');
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<{ accessToken: string; expiresIn: number; scope: string }> {
  const { payload } = await jwtVerify(input.code, secret(), {
    issuer: MCP_OAUTH_ISSUER,
    audience: AUTHORIZATION_CODE_AUDIENCE,
    subject: MCP_OAUTH_CLIENT_ID,
  });

  if (payload['tokenUse'] !== 'authorization_code') throw new Error('Invalid authorization code');
  if (typeof payload.jti !== 'string' || typeof payload.exp !== 'number') {
    throw new Error('Invalid authorization code');
  }

  const now = Math.floor(Date.now() / 1000);
  for (const [jti, expiresAt] of consumedAuthorizationCodes) {
    if (expiresAt <= now) consumedAuthorizationCodes.delete(jti);
  }
  if (consumedAuthorizationCodes.has(payload.jti)) throw new Error('Authorization code was already used');
  if (payload['clientId'] !== input.clientId || input.clientId !== MCP_OAUTH_CLIENT_ID) {
    throw new Error('Invalid client_id');
  }
  if (payload['redirectUri'] !== input.redirectUri || input.redirectUri !== MCP_OAUTH_REDIRECT_URI) {
    throw new Error('Invalid redirect_uri');
  }
  if (
    typeof payload['codeChallenge'] !== 'string' ||
    !safeEqual(pkceChallenge(input.codeVerifier), payload['codeChallenge'])
  ) {
    throw new Error('Invalid code_verifier');
  }

  consumedAuthorizationCodes.set(payload.jti, payload.exp);

  const accessToken = await new SignJWT({
    tokenUse: 'access_token',
    clientId: MCP_OAUTH_CLIENT_ID,
    scope: MCP_OAUTH_SCOPE,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(MCP_OAUTH_ISSUER)
    .setAudience(MCP_RESOURCE_URL)
    .setSubject(MCP_OAUTH_CLIENT_ID)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secret());

  return {
    accessToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    scope: MCP_OAUTH_SCOPE,
  };
}

export async function verifyMcpAccessToken(token: string): Promise<McpAccessToken> {
  const { payload } = await jwtVerify(token, secret(), {
    issuer: MCP_OAUTH_ISSUER,
    audience: MCP_RESOURCE_URL,
    subject: MCP_OAUTH_CLIENT_ID,
  });

  if (payload['tokenUse'] !== 'access_token') throw new Error('Invalid access token');
  if (payload['clientId'] !== MCP_OAUTH_CLIENT_ID) throw new Error('Invalid client');
  if (payload['scope'] !== MCP_OAUTH_SCOPE) throw new Error('Insufficient scope');
  if (typeof payload.exp !== 'number') throw new Error('Missing expiration');

  return {
    clientId: MCP_OAUTH_CLIENT_ID,
    scopes: [MCP_OAUTH_SCOPE],
    expiresAt: payload.exp,
    resource: MCP_RESOURCE_URL,
  };
}

export function authorizationServerMetadata() {
  return {
    issuer: MCP_OAUTH_ISSUER,
    authorization_endpoint: `${MCP_OAUTH_ISSUER}/oauth/authorize`,
    token_endpoint: `${MCP_OAUTH_ISSUER}/oauth/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [MCP_OAUTH_SCOPE],
  };
}

export function protectedResourceMetadata() {
  return {
    resource: MCP_RESOURCE_URL,
    authorization_servers: [MCP_OAUTH_ISSUER],
    scopes_supported: [MCP_OAUTH_SCOPE],
    bearer_methods_supported: ['header'],
    resource_name: 'RPCS1 Agent Tuner',
    resource_documentation: `${MCP_OAUTH_ISSUER}/docs/mcp`,
  };
}
