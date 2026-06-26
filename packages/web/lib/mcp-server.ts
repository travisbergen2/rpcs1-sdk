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
        'Find why an agent fails under pressure and get the runtime settings to fix it.',
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

      return {
        structuredContent,
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
