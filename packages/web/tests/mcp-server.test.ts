import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createRpcs1McpServer } from '../lib/mcp-server';

let server: McpServer | undefined;
let client: Client | undefined;

const publicToolNames = [
  'recommend_agent_configuration',
  'interpret',
  'fork',
  'normalize',
  'rewrite',
  'calibrate_profile',
  'prepare_prompt',
  'render_reply',
  'route_intent',
];

afterEach(async () => {
  await client?.close();
  await server?.close();
  client = undefined;
  server = undefined;
});

describe('RPCS1 MCP server', () => {
  it('advertises nine safe, read-only tools', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createRpcs1McpServer();
    client = new Client({ name: 'rpcs1-test-client', version: '1.0.0' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const { tools } = await client.listTools();

    expect(tools).toHaveLength(9);
    expect(tools.map((t) => t.name)).toEqual(publicToolNames);
    for (const tool of tools) {
      expect(tool.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
    }
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

  it('keeps the public server card aligned with the live tool surface', () => {
    const card = JSON.parse(
      readFileSync(
        new URL('../public/.well-known/mcp/server-card.json', import.meta.url),
        'utf8',
      ),
    );

    expect(card.serverInfo).toMatchObject({
      name: 'RPCS-1 Agent Tuner & Translation Bridge',
      version: '0.4.2',
    });
    expect(card.tools.map((tool: { name: string }) => tool.name)).toEqual(publicToolNames);
    for (const tool of card.tools) {
      expect(tool.annotations).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      });
    }
  });

  it('ships Glama ownership metadata for the maintainer account', () => {
    const claim = JSON.parse(
      readFileSync(new URL('../public/.well-known/glama.json', import.meta.url), 'utf8'),
    );

    expect(claim).toMatchObject({
      $schema: 'https://glama.ai/mcp/schemas/connector.json',
      maintainers: [{ email: 'travisbergen2@gmail.com' }],
    });
  });


  it('attaches measured receiver posture when target_model is measured', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createRpcs1McpServer();
    client = new Client({ name: 'rpcs1-test-client', version: '1.0.0' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.callTool({
      name: 'recommend_agent_configuration',
      arguments: {
        task: { task_summary: 'Summarize weekly reports' },
        environment: {
          entropy: 'moderate',
          predictability: 'somewhat_predictable',
          stakes: 'medium',
          context_relevance: 'medium',
          commitment_style: 'balanced',
        },
        target_platform: 'anthropic',
        target_model: 'claude-sonnet-4-6',
      },
    });

    expect(result.isError).not.toBe(true);
    const structured = result.structuredContent as {
      platform_parameters: {
        receiver_evidence?: { grade: string; display_name: string; scope: string };
        receiver_traits?: string[];
        system_prompt_additions?: string[];
      };
    };
    expect(structured.platform_parameters.receiver_evidence).toMatchObject({
      grade: 'confirmatory',
      display_name: 'Claude Sonnet 4.6',
    });
    expect(structured.platform_parameters.receiver_evidence?.scope).toContain('E-LIT');
    expect(structured.platform_parameters.receiver_traits?.length).toBeGreaterThan(0);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Measured receiver posture applied');

    // Unmeasured model: no evidence attached, no error
    const fallback = await client.callTool({
      name: 'recommend_agent_configuration',
      arguments: {
        task: { task_summary: 'Summarize weekly reports' },
        environment: {
          entropy: 'moderate',
          predictability: 'somewhat_predictable',
          stakes: 'medium',
          context_relevance: 'medium',
          commitment_style: 'balanced',
        },
        target_platform: 'anthropic',
        target_model: 'not-a-real-model-id',
      },
    });
    expect(fallback.isError).not.toBe(true);
    const fb = fallback.structuredContent as { platform_parameters: { receiver_evidence?: unknown } };
    expect(fb.platform_parameters.receiver_evidence).toBeUndefined();
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

  it('calibrate_profile returns the questions when called without answers', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createRpcs1McpServer();
    client = new Client({ name: 'rpcs1-test-client', version: '1.0.0' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.callTool({ name: 'calibrate_profile', arguments: {} });
    expect(result.isError).not.toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('five questions');
    expect(text).toContain('calibrate_profile');
  });

  it('calibrate_profile scores answers into a schema-shaped profile document', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createRpcs1McpServer();
    client = new Client({ name: 'rpcs1-test-client', version: '1.0.0' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.callTool({
      name: 'calibrate_profile',
      arguments: { answers: { TI: 'a', SG: 'a', FT: 'a', UE: 'a', AR: 'a' } },
    });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      version: '1.0',
      profile: { TI: 20, SG: 25, FT: 80, UE: 75, AR: 75 },
      directives: {
        structure: 'bluf',
        warmth: 'minimal',
        explicitness: 'explicit_literal',
        revision: 'open_challenge',
        ambiguity: 'commit',
      },
    });
  });

  it('render_reply returns deterministic profile-matched rewrite instructions', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createRpcs1McpServer();
    client = new Client({ name: 'rpcs1-test-client', version: '1.0.0' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.callTool({
      name: 'render_reply',
      arguments: {
        text: 'Well, there are several ways to think about this...',
        profile: { TI: 20, SG: 25, FT: 80, UE: 75, AR: 75 },
      },
    });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({ style: 'profile' });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Rewrite your draft');
    expect(text).toContain('Lead with the conclusion');
  });

  it('prepare_prompt recovers a canonical translation from ambiguous input', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createRpcs1McpServer();
    client = new Client({ name: 'rpcs1-test-client', version: '1.0.0' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.callTool({
      name: 'prepare_prompt',
      arguments: { text: 'can you fix the thing from yesterday', risk: 'advice' },
    });
    expect(result.isError).not.toBe(true);
    const structured = result.structuredContent as { canonical_translation: string; ar_level: string };
    expect(typeof structured.canonical_translation).toBe('string');
    expect(structured.ar_level).toMatch(/^AR[0-5]$/);
  });

  it('fork returns offset spans, clarifiers, and the mirror engine stamp', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createRpcs1McpServer();
    client = new Client({ name: 'rpcs1-test-client', version: '1.0.0' });
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.callTool({
      name: 'fork',
      arguments: { text: 'What do you think about React or Vue for my project?' },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('"React or Vue"');
    expect(text).toContain('compare_or_choose');
    expect(text).toContain('lock it in:');
    expect(text).toContain('Engine: mirror-only');
    const sc = result.structuredContent as { spans: Array<{ start: number; end: number }>; status: string };
    expect(sc.status).toBe('forks');
    expect(sc.spans[0].start).toBeGreaterThanOrEqual(0);
    expect(sc.spans[0].end).toBeGreaterThan(sc.spans[0].start);
  });

  it('interpret output carries the rules engine stamp', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createRpcs1McpServer();
    client = new Client({ name: 'rpcs1-test-client', version: '1.0.0' });
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.callTool({
      name: 'interpret',
      arguments: { text: 'can you fix that thing before they see it' },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Engine: rules (deterministic');
    expect((result.structuredContent as { engine: string }).engine).toBe('rules');
  });
});
