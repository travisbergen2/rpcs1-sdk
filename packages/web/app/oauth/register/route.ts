/**
 * OAuth 2.0 Dynamic Client Registration (RFC 7591) — stateless.
 *
 * MCP clients (Claude.ai, Cursor, etc.) that require the OAuth handshake call
 * this to obtain a client_id before authorizing. The issued client_id is a
 * signed JWT embedding the registered redirect URIs, so no storage is needed
 * and registrations survive deploys. Open registration is intentional: the
 * MCP resource is public and tokens gate nothing sensitive — this endpoint
 * exists for client compatibility, not secrecy.
 */
import { registerClient, MCP_OAUTH_SCOPE } from '@/lib/mcp-oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'invalid_client_metadata', error_description: 'Expected a JSON body' },
      { status: 400, headers },
    );
  }

  const redirectUris = body['redirect_uris'];
  try {
    const { clientId, redirectUris: registered } = await registerClient(redirectUris as string[]);
    return Response.json(
      {
        client_id: clientId,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        redirect_uris: registered,
        grant_types: ['authorization_code'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
        scope: MCP_OAUTH_SCOPE,
      },
      { status: 201, headers },
    );
  } catch (error) {
    return Response.json(
      {
        error: 'invalid_redirect_uri',
        error_description: error instanceof Error ? error.message : 'Registration rejected',
      },
      { status: 400, headers },
    );
  }
}
