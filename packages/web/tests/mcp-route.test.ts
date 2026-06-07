import { describe, expect, it } from 'vitest';
import { POST } from '../app/mcp/route';

const headers = {
  Accept: 'application/json, text/event-stream',
  'Content-Type': 'application/json',
  'MCP-Protocol-Version': '2025-11-25',
};

describe('RPCS1 MCP HTTP route', () => {
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
});
