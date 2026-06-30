#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { recommend } from '@rpcs1/core';
import { execSync } from 'child_process';
import { z } from 'zod';

// ── Helpers ──────────────────────────────────────────────────────

const PYTHON = process.env.RPCS1_PYTHON ?? 'python3';

function callTranslator(tool: string, args: string[]): any {
  try {
    const cmd = [PYTHON, '-m', 'rpcs1.translator.server', tool, ...args].join(' ');
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 10000, maxBuffer: 1024 * 1024 });
    return JSON.parse(output.trim());
  } catch {
    return { error: `Translator call failed for ${tool}` };
  }
}

// ── Schemas ──────────────────────────────────────────────────────

const recommendInputSchema = {
  task: z.object({
    task_summary: z.string().trim().min(1).max(2000)
      .default('Customer support agent handling refunds, billing disputes, and policy exceptions')
      .describe('Plain-language description of what the AI agent does.'),
    domain: z.string().trim().min(1).max(100).default('customer_support').optional()
      .describe('Optional domain such as coding, research, or support.'),
    expected_duration_per_call: z.enum(['short', 'medium', 'long']).default('medium').optional(),
  }).strict().default({
    task_summary: 'Customer support agent handling refunds, billing disputes, and policy exceptions',
    domain: 'customer_support',
    expected_duration_per_call: 'medium',
  }),
  environment: z.object({
    entropy: z.enum(['stable', 'moderate', 'dynamic', 'chaotic'])
      .default('dynamic')
      .describe('How often the operating environment changes.'),
    predictability: z.enum(['highly_predictable', 'somewhat_predictable', 'unpredictable'])
      .default('somewhat_predictable')
      .describe('How predictable changes are when they occur.'),
    stakes: z.enum(['low', 'medium', 'high', 'catastrophic'])
      .default('high')
      .describe('The cost of an incorrect agent action.'),
    context_relevance: z.enum(['short', 'medium', 'long'])
      .default('medium')
      .describe('How far back relevant context usually extends.'),
    commitment_style: z.enum(['decisive', 'balanced', 'cautious'])
      .default('cautious')
      .describe('How quickly the agent should commit to an action.'),
  }).strict().default({
    entropy: 'dynamic',
    predictability: 'somewhat_predictable',
    stakes: 'high',
    context_relevance: 'medium',
    commitment_style: 'cautious',
  }),
  target_platform: z.enum(['anthropic', 'openai', 'open_source', 'generic'])
    .default('anthropic')
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
      'explicit_confirmation', 'cautious_chaining', 'aggressive', 'fail_fast',
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

// ── Server ───────────────────────────────────────────────────────

function createServer() {
  const server = new McpServer(
    {
      name: 'rpcs1-agent-tuner',
      title: 'RPCS-1 Agent Tuner & Translator',
      version: '0.2.2',
      websiteUrl: 'https://rpcs1.dev',
      description:
        'Two tools in one: (1) Diagnose why your AI agent will fail before rollout — get the right temperature, ' +
        'top_p, and strategy settings. (2) Translate ambiguous human input — interpret intent, normalize fragmented ' +
        'text, and rewrite for any audience.',
    },
    {
      instructions:
        'Use this server for two things: (1) Call recommend_agent_configuration when tuning or diagnosing ' +
        'an AI agent. (2) Call interpret, normalize, or rewrite when handling ambiguous human input.',
    },
  );

  // ── Tool: recommend_agent_configuration ────────────────────────

  server.registerTool(
    'recommend_agent_configuration',
    {
      title: 'Recommend AI agent configuration',
      description:
        'Diagnose why a deployed AI agent may fail. Takes environmental entropy, predictability, stakes, ' +
        'context horizon, and commitment style, then returns receiver profile values (TI, SG, FT, UE, AR), ' +
        'platform parameters (temperature, top_p, strategy), regime prediction, reasoning, and warnings. ' +
        'Deterministic, stateless, read-only — does not store past recommendations.',
      inputSchema: recommendInputSchema,
      outputSchema: recommendationOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
      _meta: {
        'openai/toolInvocation/invoking': 'Analyzing agent-environment fit',
        'openai/toolInvocation/invoked': 'Agent configuration ready',
      },
    },
    async (input) => {
      const result = recommend(input);
      return {
        structuredContent: { ...result },
        content: [{
          type: 'text',
          text: `RPCS1 predicts a ${result.predicted_regime} regime with ${result.confidence} confidence. ` +
                `Recommended temperature: ${result.platform_parameters.temperature}. ${result.reasoning}`,
        }],
      };
    },
  );

  // ── Tool: interpret ────────────────────────────────────────────

  server.registerTool(
    'interpret',
    {
      title: 'Interpret ambiguous human input',
      description:
        'Detect ambiguity in a user message and score candidate interpretations using the RPCS-1 Signature ' +
        'Ambiguity Framework. Returns literal summary, implied meaning, confidence, AR level (AR0-AR5), ' +
        'ambiguities, clarifying questions, and per-candidate scores (IC, UE, EC, NM, SG, TI). ' +
        'Use when a user says something vague, passive-aggressive, or underspecified.',
      inputSchema: {
        text: z.string().min(1).max(5000).describe('The message to interpret.'),
        risk: z.enum(['casual', 'advice', 'high-stakes', 'safety-critical'])
          .default('advice').describe('Risk category for ambiguity threshold.'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    },
    async (input) => {
      const result = callTranslator('interpret', [input.text, '--risk', input.risk]);
      const summary = result.literal_summary || input.text;
      const arLevel = result.ar_level || 'AR0';
      const candidates = result.candidates || [];
      let text = `AR level: ${arLevel} | Confidence: ${result.confidence ?? '?'}\n`;
      text += `Literal: "${summary}"\n`;
      if (result.implied_meaning) text += `Implied: ${result.implied_meaning}\n`;
      if (result.ambiguities?.length) text += `Ambiguities: ${result.ambiguities.join('; ')}\n`;
      if (result.clarifying_questions?.length) text += `Clarify: ${result.clarifying_questions[0]}\n`;
      if (candidates.length) {
        text += `\nCandidates:\n`;
        for (const c of candidates) {
          text += `  ${c.label}: score=${c.score?.toFixed(3)} IC=${c.IC} UE=${c.UE} TI=${c.TI}\n`;
        }
      }
      return {
        structuredContent: result,
        content: [{ type: 'text', text }],
      };
    },
  );

  // ── Tool: normalize ────────────────────────────────────────────

  server.registerTool(
    'normalize',
    {
      title: 'Normalize fragmented human input',
      description:
        'Clean up text with ellipses, fragments, and run-on thoughts into coherent prose. ' +
        'Returns the number of fragments detected and the joined version. ' +
        'Use when a user types stream-of-consciousness or fragmented input.',
      inputSchema: {
        text: z.string().min(1).max(5000).describe('Fragmented text to normalize.'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    },
    async (input) => {
      const result = callTranslator('normalize', [input.text]);
      return {
        structuredContent: result,
        content: [{
          type: 'text',
          text: result.fragment_count > 1
            ? `Normalized (${result.fragment_count} fragments): ${result.normalized}`
            : `Already clean: ${result.normalized}`,
        }],
      };
    },
  );

  // ── Tool: rewrite ──────────────────────────────────────────────

  server.registerTool(
    'rewrite',
    {
      title: 'Rewrite text for a target audience',
      description:
        'Get rewrite instructions for adapting text to a specific audience style: technical, plain, ' +
        'socially_gentle, concise, detailed, or direct. Pass the result to an LLM with the ' +
        'rewrite_instructions as the system prompt. Use when communication needs tone adjustment.',
      inputSchema: {
        text: z.string().min(1).max(5000).describe('Text to rewrite.'),
        style: z.enum(['technical', 'plain', 'socially_gentle', 'concise', 'detailed', 'direct'])
          .default('plain').describe('Target audience style.'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    },
    async (input) => {
      const result = callTranslator('rewrite', [input.text, '--style', input.style]);
      return {
        structuredContent: result,
        content: [{
          type: 'text',
          text: result.rewrite_instructions
            ? `Style: ${result.style_label} (${result.style_description})\n\nInstructions:\n${result.rewrite_instructions}`
            : `Rewrite unavailable for style "${input.style}"`,
        }],
      };
    },
  );

  return server;
}

// ── Run ──────────────────────────────────────────────────────────

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
