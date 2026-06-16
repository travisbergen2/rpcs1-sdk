#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { recommend } from '../../core/src/index';
import { z } from 'zod';

const recommendInputSchema = {
  task: z.object({
    task_summary: z.string().trim().min(1).max(2000)
      .describe('Plain-language description of what the AI agent does.'),
    domain: z.string().trim().min(1).max(100).optional()
      .describe('Optional domain such as coding, research, or support.'),
    expected_duration_per_call: z.enum(['short', 'medium', 'long']).optional(),
  }).strict(),
  environment: z.object({
    entropy: z.enum(['stable', 'moderate', 'dynamic', 'chaotic'])
      .describe('How often the operating environment changes.'),
    predictability: z.enum(['highly_predictable', 'somewhat_predictable', 'unpredictable'])
      .describe('How predictable changes are when they occur.'),
    stakes: z.enum(['low', 'medium', 'high', 'catastrophic'])
      .describe('The cost of an incorrect agent action.'),
    context_relevance: z.enum(['short', 'medium', 'long'])
      .describe('How far back relevant context usually extends.'),
    commitment_style: z.enum(['decisive', 'balanced', 'cautious'])
      .describe('How quickly the agent should commit to an action.'),
  }).strict(),
  target_platform: z.enum(['anthropic', 'openai', 'open_source', 'generic'])
    .describe('The platform whose runtime parameters should be recommended.'),
};

const recommendationOutputSchema = {
  receiver_profile: z.object({
    TI: z.number(),
    SG: z.number(),
    FT: z.number(),
    UE: z.number(),
    AR: z.number(),
  }),
  platform_parameters: z.object({
    temperature: z.number(),
    top_p: z.number().optional(),
    max_tokens: z.number(),
    model_recommendation: z.string().optional(),
    system_prompt_additions: z.array(z.string()).optional(),
    tool_use_strategy: z.enum([
      'explicit_confirmation',
      'cautious_chaining',
      'aggressive',
      'fail_fast',
    ]).optional(),
    retry_strategy: z.enum(['aggressive', 'moderate', 'minimal']).optional(),
    context_strategy: z.enum(['long_window', 'rolling_summary', 'frequent_grounding']).optional(),
  }),
  predicted_regime: z.enum(['stable', 'near_oscillation', 'near_overload', 'near_freeze']),
  reasoning: z.string(),
  warnings: z.array(z.string()),
  imm_principles_applied: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low']),
};

function createServer() {
  const server = new McpServer(
    {
      name: 'rpcs1-agent-tuner',
      title: 'RPCS1 Agent Tuner',
      version: '0.2.1',
      websiteUrl: 'https://rpcs1.dev',
      description:
        'Deterministic diagnostic tools for optimizing deployed AI agents and diagnosing environment mismatch.',
    },
    {
      instructions:
        'Use RPCS1 to configure AI agents for their operating environment. ' +
        'Call recommend_agent_configuration when the user is designing, tuning, or diagnosing an AI agent. ' +
        'The tool is deterministic, stateless, read-only, and does not store, list, or update recommendations. ' +
        'Clients should persist results when history is needed.',
    },
  );

  server.registerTool(
    'recommend_agent_configuration',
    {
      title: 'Recommend AI agent configuration',
      description:
        'Use this stateless, read-only tool when a deployed AI agent, support copilot, or agent workflow ' +
        'needs concrete LLM and runtime settings matched to environmental entropy, predictability, stakes, ' +
        'context horizon, and commitment style. It diagnoses likely oscillation, overload, freeze, or mismatch ' +
        'and returns receiver profile values ' +
        '(TI, SG, FT, UE, AR), platform parameters, confidence, reasoning, warnings, and applied IMM principles. ' +
        'It does not store, list, or update past recommendations.',
      inputSchema: recommendInputSchema,
      outputSchema: recommendationOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      _meta: {
        'openai/toolInvocation/invoking': 'Analyzing agent-environment fit',
        'openai/toolInvocation/invoked': 'Agent configuration ready',
      },
    },
    async (input) => {
      const result = recommend(input);

      return {
        structuredContent: { ...result },
        content: [
          {
            type: 'text',
            text:
              `RPCS1 predicts a ${result.predicted_regime} regime with ${result.confidence} confidence. ` +
              `Recommended temperature: ${result.platform_parameters.temperature}. ${result.reasoning}`,
          },
        ],
      };
    },
  );

  return server;
}

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
