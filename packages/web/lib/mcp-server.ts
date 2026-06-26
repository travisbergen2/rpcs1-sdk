import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { recommend } from '@rpcs1/core';
import { recommendInputSchema, recommendationOutputSchema } from './recommend-schema';

export function createRpcs1McpServer() {
  const server = new McpServer(
    {
      name: 'rpcs1-agent-tuner',
      title: 'RPCS1 Agent Tuner',
      version: '0.2.1',
      websiteUrl: 'https://rpcs1.dev',
      description:
        'Find why an agent fails under pressure.',
    },
    {
      instructions:
        'Use RPCS1 to diagnose whether an agent is matched to its operating environment. ' +
        'When a user is designing, tuning, or debugging an agent, answer with the failure-risk score first, ' +
        'then the runtime settings and the next test to run. Keep the result concrete and avoid abstract theory unless asked. ' +
        'The tool is deterministic, stateless, read-only, and does not store, list, or update recommendations. ' +
        'Clients should persist results when history is needed.',
    },
  );

  server.registerTool(
    'recommend_agent_configuration',
    {
      title: 'Recommend AI agent configuration',
      description:
        'Use this stateless, read-only tool when a deployed support copilot, coding agent, research agent, or workflow assistant ' +
        'needs a failure-risk score and concrete runtime settings matched to environmental entropy, predictability, stakes, ' +
        'context horizon, and commitment style. It diagnoses likely oscillation, overload, freeze, or mismatch and returns ' +
        'receiver profile values (TI, SG, FT, UE, AR), platform parameters, confidence, reasoning, warnings, the next test to run, ' +
        'and applied IMM principles. It does not store, list, or update past recommendations.',
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
      const structuredContent: Record<string, unknown> = { ...result };
      const nextTest = suggestNextTest(result.predicted_regime, result.warnings, result.platform_parameters.translation_posture);
      const posture = result.platform_parameters.translation_posture;
      const postureLine = posture ? ` Translation posture: ${posture}.` : '';
      const warningLine = result.warnings[0] ? ` Warning: ${result.warnings[0]}` : '';

      return {
        structuredContent,
        content: [
          {
            type: 'text',
            text: [
              `Status: ${result.predicted_regime} (${result.confidence} confidence).`,
              `Configuration: temperature ${result.platform_parameters.temperature}, ${result.platform_parameters.context_strategy}, ${result.platform_parameters.tool_use_strategy}.`,
              `Best next check: ${nextTest}.`,
              postureLine ? postureLine.replace('Translation posture', 'Language mode') : '',
              warningLine,
            ].filter(Boolean).join(' '),
          },
        ],
      };
    },
  );

  return server;
}

function suggestNextTest(
  regime: string,
  warnings: string[],
  translationPosture?: string,
): string {
  const firstWarning = warnings[0] ?? '';

  if (firstWarning.includes('Oscillation risk')) {
    return 'rerun with one shorter-history case and one ambiguous case';
  }
  if (firstWarning.includes('Overload risk')) {
    return 'rerun with a high-pressure case and lower signal gain';
  }
  if (firstWarning.includes('Freeze risk')) {
    return 'rerun with a policy edge case and lower filtering threshold';
  }
  if (firstWarning.includes('High stakes') && firstWarning.includes('AR')) {
    return 'rerun with the highest-risk exception path and a stricter handoff rule';
  }

  switch (translationPosture) {
    case 'face_preserving':
      return 'rerun on a user-facing prompt where tone and correction style matter';
    case 'bridging':
      return 'rerun on one ambiguous prompt and one technical prompt';
    case 'minimal_clarifying':
      return 'rerun on a high-ambiguity prompt and check whether one question is enough';
    case 'direct':
      return 'rerun on the same workload plus one harder edge case';
    default:
      break;
  }

  if (regime === 'near_oscillation') return 'rerun with a shorter context window';
  if (regime === 'near_overload') return 'rerun with stricter gating before tool use';
  if (regime === 'near_freeze') return 'rerun with a lower filtering threshold';

  return 'rerun on the same workload plus one harder edge case';
}
