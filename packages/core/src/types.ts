// ─── Input Types ─────────────────────────────────────────────────────────────

export type EnvironmentEntropy =
  | 'stable'
  | 'moderate'
  | 'dynamic'
  | 'chaotic';

export type EnvironmentPredictability =
  | 'highly_predictable'
  | 'somewhat_predictable'
  | 'unpredictable';

export type Stakes = 'low' | 'medium' | 'high' | 'catastrophic';

export type ContextRelevance = 'short' | 'medium' | 'long';

export type CommitmentStyle = 'decisive' | 'balanced' | 'cautious';

export type Platform = 'anthropic' | 'openai' | 'open_source' | 'generic';

export interface AgentEnvironment {
  /** How often does the environment change? */
  entropy: EnvironmentEntropy;
  /** How predictable are changes when they occur? */
  predictability: EnvironmentPredictability;
  /** Cost of an error — drives conservatism */
  stakes: Stakes;
  /** How far back in context does relevant history reach? */
  context_relevance: ContextRelevance;
  /** Should the agent commit quickly or deliberate carefully? */
  commitment_style: CommitmentStyle;
}

export interface TaskDescriptor {
  /** Free-text description of what the agent does */
  task_summary: string;
  /** Optional domain hint: 'customer_support' | 'research' | 'coding' | etc. */
  domain?: string;
  /** How long each agent invocation is expected to run */
  expected_duration_per_call?: 'short' | 'medium' | 'long';
}

export interface RecommendInput {
  task: TaskDescriptor;
  environment: AgentEnvironment;
  target_platform: Platform;
}

// ─── Output Types ─────────────────────────────────────────────────────────────

/** Five RPCS-1 receiver primitives, all on [0, 100] scale */
export interface ReceiverProfile {
  /** Temporal Integration window — how much history the receiver integrates */
  TI: number;
  /** Signal Gain — how strongly the receiver amplifies incoming signals */
  SG: number;
  /** Filtering Threshold — how conservatively the receiver gates action */
  FT: number;
  /** Update Elasticity — how readily the receiver revises its model */
  UE: number;
  /** Ambiguity Resolution — how aggressively the receiver resolves uncertainty */
  AR: number;
}

export type ToolUseStrategy =
  | 'explicit_confirmation'
  | 'cautious_chaining'
  | 'aggressive'
  | 'fail_fast';

export type RetryStrategy = 'aggressive' | 'moderate' | 'minimal';

export type ContextStrategy =
  | 'long_window'
  | 'rolling_summary'
  | 'frequent_grounding';

export type TranslationPosture =
  | 'direct'
  | 'bridging'
  | 'face_preserving'
  | 'minimal_clarifying';


/** Evidence summary for a measured receiver entry (E-LIT program). */
export interface ReceiverEvidenceSummary {
  model_key: string;
  display_name: string;
  grade: 'confirmatory' | 'corroboration' | 'self_measurement';
  /** Fenced literalness, [-1, +1]. */
  li2: number;
  /** Truth-override boundary rung (0–5). */
  ob: number;
  /** Rungs with modal comply-then-correct (correction fringe). */
  fringe: number[];
  measured_on: string;
  scope: string;
}

export interface PlatformParameters {
  temperature: number;
  top_p?: number;
  max_tokens: number;
  model_recommendation?: string;
  system_prompt_additions?: string[];
  tool_use_strategy?: ToolUseStrategy;
  retry_strategy?: RetryStrategy;
  context_strategy?: ContextStrategy;
  translation_posture?: TranslationPosture;
  translation_notes?: string[];
  /**
   * Present only when the target model has a MEASURED per-model receiver
   * entry (E-LIT table). Absence means "no data", never "no posture".
   */
  receiver_evidence?: ReceiverEvidenceSummary;
  /** Reliability warnings and named traits for the measured receiver. */
  receiver_traits?: string[];
}

export type PredictedRegime =
  | 'stable'
  | 'near_oscillation'
  | 'near_overload'
  | 'near_freeze';

export type Confidence = 'high' | 'medium' | 'low';

export interface Recommendation {
  /** The five RPCS-1 receiver primitives computed for this environment */
  receiver_profile: ReceiverProfile;
  /** Platform-specific LLM parameters derived from the receiver profile */
  platform_parameters: PlatformParameters;
  /** Predicted stability regime under the recommended parameters */
  predicted_regime: PredictedRegime;
  /** Human-readable explanation tracing each recommendation to an IMM principle */
  reasoning: string;
  /** Warnings when configuration is near a failure-regime boundary */
  warnings: string[];
  /** IMM principles applied (e.g. "Matching Principle: TI ~ 1/H") */
  imm_principles_applied: string[];
  /** Confidence in recommendation based on input completeness */
  confidence: Confidence;
}
