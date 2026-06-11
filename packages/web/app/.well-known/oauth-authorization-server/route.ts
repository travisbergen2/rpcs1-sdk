import { authorizationServerMetadata } from '@/lib/mcp-oauth';

export function GET() {
  return Response.json(authorizationServerMetadata(), {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
