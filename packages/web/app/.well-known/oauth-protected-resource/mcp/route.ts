import { protectedResourceMetadata } from '@/lib/mcp-oauth';

export function GET() {
  return Response.json(protectedResourceMetadata(), {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
