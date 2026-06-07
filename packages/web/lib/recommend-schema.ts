import { z } from 'zod';

export const recommendInputSchema = z.object({
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
}).strict();

export const recommendationOutputSchema = {
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
