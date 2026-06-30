import { afterEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createRpcs1McpServer } from '../lib/mcp-server';

let server: McpServer | undefined;
let client: Client | undefined;

afterEach(async () => {
  await client?.close();
  await server?.close();
  client = undefined;
  server = undefined;
});

describe('RPCS1 MCP server', () => {
  it('advertises four safe, read-only tools', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createRpcs1McpServer();
    client = new Client({ name: 'rpcs1-test-client', version: '1.0.0' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const { tools } = await client.listTools();

    expect(tools).toHaveLength(4);
    expect(tools[0].name).toBe('recommend_agent_configuration');
    expect(tools[0].annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    });
    expect(tools[0].inputSchema.properties).toMatchObject({
      task: {
        default: {
          task_summary: 'Customer support agent handling refunds, billing disputes, and policy exceptions',
          domain: 'customer_support',
          expected_duration_per_call: 'medium',
        },
        properties: {
          task_summary: {
            default: 'Customer support agent handling refunds, billing disputes, and policy exceptions',
          },
          domain: { default: 'customer_support' },
          expected_duration_per_call: { default: 'medium' },
        },
      },
      environment: {
        default: {
          entropy: 'dynamic',
          predictability: 'somewhat_predictable',
          stakes: 'high',
          context_relevance: 'medium',
          commitment_style: 'cautious',
        },
        properties: {
          entropy: { default: 'dynamic' },
          predictability: { default: 'somewhat_predictable' },
          stakes: { default: 'high' },
          context_relevance: { default: 'medium' },
          commitment_style: { default: 'cautious' },
        },
      },
      target_platform: { default: 'anthropic' },
    });
  });

  it('returns structured recommendations through a real MCP call', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createRpcs1McpServer();
    client = new Client({ name: 'rpcs1-test-client', version: '1.0.0' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.callTool({
      name: 'recommend_agent_configuration',
      arguments: {
        task: {
          task_summary: 'Customer support agent handling refund requests',
          domain: 'customer_support',
        },
        environment: {
          entropy: 'dynamic',
          predictability: 'somewhat_predictable',
          stakes: 'high',
          context_relevance: 'medium',
          commitment_style: 'cautious',
        },
        target_platform: 'openai',
      },
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      predicted_regime: 'stable',
      confidence: 'high',
      platform_parameters: {
        tool_use_strategy: 'explicit_confirmation',
      },
    });
  });

  it('can run from schema defaults with only target platform supplied', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createRpcs1McpServer();
    client = new Client({ name: 'rpcs1-test-client', version: '1.0.0' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.callTool({
      name: 'recommend_agent_configuration',
      arguments: {
        target_platform: 'anthropic',
      },
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      predicted_regime: 'stable',
      confidence: 'high',
      platform_parameters: {
        model_recommendation: 'claude-sonnet-4-6',
      },
    });
  });

  it('does not return conflicting Anthropic sampling controls', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createRpcs1McpServer();
    client = new Client({ name: 'rpcs1-test-client', version: '1.0.0' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.callTool({
      name: 'recommend_agent_configuration',
      arguments: {
        task: { task_summary: 'Research assistant' },
        environment: {
          entropy: 'dynamic',
          predictability: 'somewhat_predictable',
          stakes: 'medium',
          context_relevance: 'long',
          commitment_style: 'balanced',
        },
        target_platform: 'anthropic',
      },
    });
    const structured = result.structuredContent as {
      platform_parameters: { temperature?: number; top_p?: number };
      reasoning: string;
    };

    expect(structured.platform_parameters.temperature).toBeDefined();
    expect(structured.platform_parameters.top_p).toBeUndefined();
    expect(structured.reasoning).toContain('top_p is omitted');
  });
});
