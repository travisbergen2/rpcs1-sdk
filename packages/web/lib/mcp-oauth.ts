import { createHash, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env } from './env';

export const MCP_OAUTH_CLIENT_ID = 'hyperagent-rpcs1';
export const MCP_OAUTH_REDIRECT_URI = 'https://hyperagent.com/api/mcp-servers/callback';
export const MCP_OAUTH_SCOPE = 'mcp:tools';
export const MCP_RESOURCE_URL = 'https://rpcs1.dev/mcp';
export const MCP_OAUTH_ISSUER = 'https://rpcs1.dev';

/**
 * Client model — two kinds, no database:
 *  1. The pinned static client ('hyperagent-rpcs1', legacy) with its fixed
 *     redirect URI.
 *  2. Dynamically registered clients (RFC 7591): client_id is 'dyn_' + a JWT
 *     signed with the server secret whose claims carry the registered
 *     redirect URIs. Stateless — registration survives deploys and scales
 *     without storage. Anyone can register; that is intentional: the MCP
 *     resource itself is public and the token gates nothing sensitive. The
 *     OAuth layer exists for client-compatibility (Claude.ai, Hyperagent and
 *     other connectors that require the OAuth handshake), not for secrecy.
 */
const DYNAMIC_CLIENT_PREFIX = 'dyn_';
const CLIENT_REGISTRATION_AUDIENCE = 'rpcs1-oauth-client';
const AUTHORIZATION_CODE_AUDIENCE = 'rpcs1-oauth-token';
const AUTHORIZATION_CODE_TTL_SECONDS = 120;
const ACCESS_TOKEN_TTL_SECONDS = 3600;
const MAX_REDIRECT_URIS = 8;
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

// ─── Dynamic client registration (RFC 7591, stateless) ─────────────────────

export function isAcceptableRedirectUri(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol === 'https:') return true;
  // Loopback redirect URIs are standard for native/desktop MCP clients.
  return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
}

export async function registerClient(redirectUris: string[]): Promise<{ clientId: string; redirectUris: string[] }> {
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    throw new Error('redirect_uris must be a non-empty array');
  }
  if (redirectUris.length > MAX_REDIRECT_URIS) {
    throw new Error(`redirect_uris must contain at most ${MAX_REDIRECT_URIS} entries`);
  }
  for (const uri of redirectUris) {
    if (typeof uri !== 'string' || uri.length > 2048 || !isAcceptableRedirectUri(uri)) {
      throw new Error(`Unacceptable redirect_uri: ${String(uri).slice(0, 100)} (https or http://localhost required)`);
    }
  }
  const token = await new SignJWT({ tokenUse: 'client_registration', redirectUris })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(MCP_OAUTH_ISSUER)
    .setAudience(CLIENT_REGISTRATION_AUDIENCE)
    .setSubject('dynamic-client')
    .setIssuedAt()
    .sign(secret());
  return { clientId: `${DYNAMIC_CLIENT_PREFIX}${token}`, redirectUris };
}

/** Resolve a client_id to its allowed redirect URIs. Throws on unknown clients. */
export async function resolveClientRedirectUris(clientId: string): Promise<string[]> {
  if (clientId === MCP_OAUTH_CLIENT_ID) return [MCP_OAUTH_REDIRECT_URI];
  if (clientId.startsWith(DYNAMIC_CLIENT_PREFIX)) {
    const { payload } = await jwtVerify(clientId.slice(DYNAMIC_CLIENT_PREFIX.length), secret(), {
      issuer: MCP_OAUTH_ISSUER,
      audience: CLIENT_REGISTRATION_AUDIENCE,
    });
    if (payload['tokenUse'] !== 'client_registration' || !Array.isArray(payload['redirectUris'])) {
      throw new Error('Invalid client registration');
    }
    return payload['redirectUris'] as string[];
  }
  throw new Error('Unknown client_id');
}

// ─── Authorization request validation ───────────────────────────────────────

export async function validateAuthorizationRequest(params: URLSearchParams): Promise<string | null> {
  if (params.get('response_type') !== 'code') return 'response_type must be code';

  const clientId = params.get('client_id');
  if (!clientId) return 'client_id is required';
  let allowedRedirects: string[];
  try {
    allowedRedirects = await resolveClientRedirectUris(clientId);
  } catch {
    return 'Unknown client_id — register via /oauth/register first';
  }

  const redirectUri = params.get('redirect_uri');
  if (!redirectUri || !allowedRedirects.includes(redirectUri)) return 'Invalid redirect_uri';

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
  const clientId = params.get('client_id')!;
  const claims: AuthorizationCodeClaims = {
    clientId,
    redirectUri: params.get('redirect_uri')!,
    codeChallenge: params.get('code_challenge')!,
    scope: MCP_OAUTH_SCOPE,
    resource: params.get('resource') ?? MCP_RESOURCE_URL,
  };

  return new SignJWT({ ...claims, tokenUse: 'authorization_code' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(MCP_OAUTH_ISSUER)
    .setAudience(AUTHORIZATION_CODE_AUDIENCE)
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
  // The code must be redeemed by the client and redirect URI it was issued to.
  if (payload['clientId'] !== input.clientId) throw new Error('Invalid client_id');
  if (payload['redirectUri'] !== input.redirectUri) throw new Error('Invalid redirect_uri');
  if (
    typeof payload['codeChallenge'] !== 'string' ||
    !safeEqual(pkceChallenge(input.codeVerifier), payload['codeChallenge'])
  ) {
    throw new Error('Invalid code_verifier');
  }

  consumedAuthorizationCodes.set(payload.jti, payload.exp);

  const accessToken = await new SignJWT({
    tokenUse: 'access_token',
    clientId: input.clientId,
    scope: MCP_OAUTH_SCOPE,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(MCP_OAUTH_ISSUER)
    .setAudience(MCP_RESOURCE_URL)
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
  });

  if (payload['tokenUse'] !== 'access_token') throw new Error('Invalid access token');
  if (typeof payload['clientId'] !== 'string' || payload['clientId'].length === 0) {
    throw new Error('Invalid client');
  }
  if (payload['scope'] !== MCP_OAUTH_SCOPE) throw new Error('Insufficient scope');
  if (typeof payload.exp !== 'number') throw new Error('Missing expiration');

  return {
    clientId: payload['clientId'],
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
    registration_endpoint: `${MCP_OAUTH_ISSUER}/oauth/register`,
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
