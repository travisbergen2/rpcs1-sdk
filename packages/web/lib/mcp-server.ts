import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { recommend } from '@rpcs1/core';
import { recommendInputSchema, recommendationOutputSchema } from './recommend-schema';

export function createRpcs1McpServer() {
  const server = new McpServer(
    {
      name: 'rpcs1-agent-tuner',
      title: 'RPCS1 Agent Tuner',
      version: '0.2.0',
      websiteUrl: 'https://rpcs1.dev',
      description:
        'Deterministic context-alignment tools for configuring AI agents and diagnosing stability regimes.',
    },
    {
      instructions:
        'Use RPCS1 to configure AI agents for their operating environment. ' +
        'Call recommend_agent_configuration when the user is designing, tuning, or diagnosing an AI agent. ' +
        'The tool is deterministic, read-only, and does not replace domain-specific safety review.',
    },
  );

  server.registerTool(
    'recommend_agent_configuration',
    {
      title: 'Recommend AI agent configuration',
      description:
        'Use this when a user needs concrete LLM and agent-runtime settings matched to environmental ' +
        'entropy, predictability, stakes, context horizon, and commitment style. It diagnoses likely ' +
        'oscillation, overload, or freeze regimes and returns explainable RPCS1 receiver dynamics.',
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
