import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { recommend } from '@rpcs1/core';
import { execSync } from 'child_process';
import { z } from 'zod';
import { recommendInputSchema, recommendationOutputSchema } from './recommend-schema';

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

export function createRpcs1McpServer() {
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
        'Use this server for two categories of work. Category 1 — Agent tuning: Call recommend_agent_configuration ' +
        'when designing, tuning, or diagnosing an AI agent. Category 2 — Translation: Call interpret when a user says ' +
        'something ambiguous. Call normalize when input is fragmented. Call rewrite when text needs tone adjustment.',
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
      const profile = result.receiver_profile;
      const nextTest = suggestNextTest(result.predicted_regime, result.warnings, (result.platform_parameters as any).translation_posture);
      return {
        structuredContent: { ...result } as Record<string, unknown>,
        content: [{
          type: 'text',
          text: [
            `Status: ${result.predicted_regime} (${result.confidence} confidence).`,
            `Receiver profile: TI ${Math.round(profile.TI)}, SG ${Math.round(profile.SG)}, FT ${Math.round(profile.FT)}, UE ${Math.round(profile.UE)}, AR ${Math.round(profile.AR)}.`,
            `Configuration: temperature ${result.platform_parameters.temperature}, ${result.platform_parameters.context_strategy}, ${result.platform_parameters.tool_use_strategy}.`,
            `Best next check: ${nextTest}.`,
          ].filter(Boolean).join(' '),
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
        'Detect ambiguity in user messages using the RPCS-1 Signature Ambiguity Framework. Returns AR level ' +
        '(AR0-AR5), confidence, candidate interpretations with scores, clarifying questions, and suggested next step. ' +
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
      let text = `AR level: ${result.ar_level || 'AR0'} | Confidence: ${result.confidence ?? '?'}\n`;
      text += `Literal: "${result.literal_summary || input.text}"\n`;
      if (result.implied_meaning) text += `Implied: ${result.implied_meaning}\n`;
      if (result.ambiguities?.length) text += `Ambiguities: ${result.ambiguities.join('; ')}\n`;
      if (result.clarifying_questions?.length) text += `Clarify: ${result.clarifying_questions[0]}\n`;
      return { structuredContent: result, content: [{ type: 'text', text }] };
    },
  );

  // ── Tool: normalize ────────────────────────────────────────────

  server.registerTool(
    'normalize',
    {
      title: 'Normalize fragmented human input',
      description:
        'Clean up text with ellipses, fragments, and run-on thoughts into coherent prose. ' +
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
        content: [{ type: 'text', text: result.normalized || input.text }],
      };
    },
  );

  // ── Tool: rewrite ──────────────────────────────────────────────

  server.registerTool(
    'rewrite',
    {
      title: 'Rewrite text for a target audience',
      description:
        'Get rewrite instructions for adapting text to a specific style: technical, plain, socially_gentle, ' +
        'concise, detailed, or direct. Use when communication needs tone adjustment.',
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
            ? `Style: ${result.style_label}\n\nInstructions: ${result.rewrite_instructions}`
            : `Rewrite unavailable for style "${input.style}"`,
        }],
      };
    },
  );

  return server;
}

function suggestNextTest(regime: string, warnings: string[], translationPosture?: string): string {
  const w = warnings[0] ?? '';
  if (w.includes('Oscillation')) return 'rerun with one shorter-history case and one ambiguous case';
  if (w.includes('Overload')) return 'rerun with a high-pressure case and lower signal gain';
  if (w.includes('Freeze')) return 'rerun with a policy edge case and lower filtering threshold';
  if (regime === 'near_oscillation') return 'rerun with a shorter context window';
  if (regime === 'near_overload') return 'rerun with stricter gating before tool use';
  if (regime === 'near_freeze') return 'rerun with a lower filtering threshold';
  return 'rerun on the same workload plus one harder edge case';
}
