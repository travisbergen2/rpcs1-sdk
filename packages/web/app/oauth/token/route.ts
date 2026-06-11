import {
  exchangeAuthorizationCode,
  MCP_OAUTH_CLIENT_ID,
  MCP_OAUTH_REDIRECT_URI,
} from '@/lib/mcp-oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = {
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
};

function oauthError(error: string, description: string, status = 400) {
  return Response.json(
    { error, error_description: description },
    { status, headers },
  );
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return oauthError('invalid_request', 'Expected form-encoded token request');
  }

  if (form.get('grant_type') !== 'authorization_code') {
    return oauthError('unsupported_grant_type', 'grant_type must be authorization_code');
  }

  const code = form.get('code');
  const clientId = form.get('client_id');
  const redirectUri = form.get('redirect_uri');
  const codeVerifier = form.get('code_verifier');

  if (
    typeof code !== 'string' ||
    typeof clientId !== 'string' ||
    typeof redirectUri !== 'string' ||
    typeof codeVerifier !== 'string'
  ) {
    return oauthError('invalid_request', 'code, client_id, redirect_uri, and code_verifier are required');
  }

  if (clientId !== MCP_OAUTH_CLIENT_ID || redirectUri !== MCP_OAUTH_REDIRECT_URI) {
    return oauthError('invalid_grant', 'Client or redirect URI does not match');
  }

  try {
    const result = await exchangeAuthorizationCode({
      code,
      clientId,
      redirectUri,
      codeVerifier,
    });

    return Response.json(
      {
        access_token: result.accessToken,
        token_type: 'Bearer',
        expires_in: result.expiresIn,
        scope: result.scope,
      },
      { headers },
    );
  } catch {
    return oauthError('invalid_grant', 'Authorization code or PKCE verifier is invalid');
  }
}
