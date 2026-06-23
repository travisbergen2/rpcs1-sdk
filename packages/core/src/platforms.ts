/**
 * Map receiver profile → platform-specific LLM parameters.
 *
 * Every mapping is a deterministic function of the receiver primitives and
 * the platform config. No guessing, no defaults silently applied.
 */

import {
  ReceiverProfile,
  PlatformParameters,
  Platform,
  ToolUseStrategy,
  RetryStrategy,
  ContextStrategy,
} from './types.js';

interface PlatformConfig {
  model_recommendations: Record<string, string> | null;
  temperature_range: number[];
  max_tokens_range: number[];
  supports_top_p: boolean;
  system_prompt_templates: Record<string, string>;
}

const systemPromptTemplates = {
  high_stakes:
    'Before taking any action, verify your understanding by restating the request. If any aspect is ambiguous, ask for clarification rather than proceeding.',
  rapid_response:
    'Be concise. Take action without extensive deliberation when the path is clear.',
  ambiguity_caution:
    'When information is incomplete, explicitly acknowledge the uncertainty before proceeding.',
  high_filter:
    'Only act on information you are highly confident about. Treat uncertain signals as noise.',
} satisfies Record<string, string>;

const platformsConfig = {
  anthropic: {
    model_recommendations: {
      default: 'claude-sonnet-4-6',
      complex_reasoning: 'claude-opus-4-6',
      speed_priority: 'claude-sonnet-4-6',
      cheap_high_volume: 'claude-haiku-4-5-20251001',
    },
    temperature_range: [0.0, 1.0],
    max_tokens_range: [256, 8192],
    supports_top_p: true,
    system_prompt_templates: systemPromptTemplates,
  },
  openai: {
    model_recommendations: {
      default: 'gpt-4o',
      complex_reasoning: 'o1',
      speed_priority: 'gpt-4o-mini',
      cheap_high_volume: 'gpt-4o-mini',
    },
    temperature_range: [0.0, 2.0],
    max_tokens_range: [256, 16384],
    supports_top_p: true,
    system_prompt_templates: systemPromptTemplates,
  },
  open_source: {
    model_recommendations: {
      default: 'llama-3-70b',
      complex_reasoning: 'deepseek-r1',
      speed_priority: 'llama-3-8b',
      cheap_high_volume: 'llama-3-8b',
    },
    temperature_range: [0.0, 2.0],
    max_tokens_range: [256, 8192],
    supports_top_p: true,
    system_prompt_templates: systemPromptTemplates,
  },
  generic: {
    model_recommendations: null,
    temperature_range: [0.0, 1.0],
    max_tokens_range: [256, 4096],
    supports_top_p: true,
    system_prompt_templates: systemPromptTemplates,
  },
} satisfies Record<Platform, PlatformConfig>;

// ─── Temperature: SG → temperature (inverse) ─────────────────────────────────
// High SG (sharp discrimination) maps to low temperature (crisp outputs).
// Low SG (broad receptivity) maps to higher temperature (exploratory outputs).

function mapSGToTemperature(SG: number, range: number[]): number {
  const lo = range[0]!;
  const hi = range[1]!;
  // SG 100 → temperature lo; SG 0 → temperature hi
  const raw = hi - (SG / 100) * (hi - lo);
  return Math.round(raw * 100) / 100;
}

// ─── Max tokens: TI → max_tokens ─────────────────────────────────────────────
// High TI (long integration) → more tokens for reasoning.
// Low TI → shorter, faster outputs.

function mapTIToMaxTokens(TI: number, range: number[]): number {
  const lo = range[0]!;
  const hi = range[1]!;
  const raw = lo + (TI / 100) * (hi - lo);
  return Math.round(raw / 256) * 256; // Round to nearest 256
}

// ─── Context strategy: TI → strategy ─────────────────────────────────────────

function mapTIToContextStrategy(TI: number): ContextStrategy {
  if (TI >= 65) return 'long_window';
  if (TI >= 35) return 'rolling_summary';
  return 'frequent_grounding';
}

// ─── Tool use strategy: AR + FT ───────────────────────────────────────────────

function mapARToToolStrategy(AR: number, FT: number): ToolUseStrategy {
  if (FT >= 65) return 'explicit_confirmation'; // very conservative
  if (AR <= 35) return 'cautious_chaining';     // low ambiguity resolution → cautious
  if (AR >= 65) return 'aggressive';            // decisive, low stakes
  return 'fail_fast';                           // moderate
}

// ─── Retry strategy: UE ───────────────────────────────────────────────────────

function mapUEToRetryStrategy(UE: number): RetryStrategy {
  if (UE >= 65) return 'aggressive';
  if (UE >= 35) return 'moderate';
  return 'minimal';
}

// ─── Model selection ──────────────────────────────────────────────────────────

function selectModel(
  profile: ReceiverProfile,
  models: Record<string, string> | null,
): string | undefined {
  if (!models) return undefined;
  // High TI + low SG → complex reasoning needed
  if (profile.TI >= 65 && profile.SG <= 40) return models['complex_reasoning'];
  // Low TI + high UE → speed priority
  if (profile.TI <= 30 && profile.UE >= 65) return models['speed_priority'];
  return models['default'];
}

// ─── System prompt additions ──────────────────────────────────────────────────

function buildSystemPromptAdditions(
  profile: ReceiverProfile,
  templates: Record<string, string>,
): string[] {
  const additions: string[] = [];

  if (profile.FT >= 60) {
    additions.push(templates['high_stakes']);
  }
  if (profile.TI <= 25) {
    additions.push(templates['rapid_response']);
  }
  if (profile.AR <= 35) {
    additions.push(templates['ambiguity_caution']);
  }
  if (profile.FT >= 75) {
    additions.push(templates['high_filter']);
  }

  return [...new Set(additions)]; // deduplicate
}

// ─── Top-level mapping ────────────────────────────────────────────────────────

export function mapToParameters(
  profile: ReceiverProfile,
  platform: Platform,
): PlatformParameters {
  const config = (platformsConfig as Record<string, PlatformConfig>)[platform];

  const temperature = mapSGToTemperature(profile.SG, config.temperature_range);
  const max_tokens = mapTIToMaxTokens(profile.TI, config.max_tokens_range);
  const context_strategy = mapTIToContextStrategy(profile.TI);
  const tool_use_strategy = mapARToToolStrategy(profile.AR, profile.FT);
  const retry_strategy = mapUEToRetryStrategy(profile.UE);
  const model_recommendation = selectModel(profile, config.model_recommendations);
  const system_prompt_additions = buildSystemPromptAdditions(profile, config.system_prompt_templates);

  const params: PlatformParameters = {
    temperature,
    max_tokens,
    context_strategy,
    tool_use_strategy,
    retry_strategy,
    system_prompt_additions,
  };

  if (model_recommendation) {
    params.model_recommendation = model_recommendation;
  }

  if (config.supports_top_p && platform !== 'anthropic') {
    // top_p mirrors temperature intent: high SG → low top_p (stays in [0.4, 1.0])
    const rawTopP = (1 - profile.SG / 100) * 0.6 + 0.4;
    params.top_p = Math.round(rawTopP * 100) / 100;
  }

  return params;
}
