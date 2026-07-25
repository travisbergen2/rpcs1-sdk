export { recommend } from './recommend.js';
export { computeReceiverProfile } from './primitives.js';
export { mapToParameters } from './platforms.js';
export { evaluateRegime, generateReasoning, generateWarnings, listPrinciplesApplied, assessConfidence } from './analysis.js';
export { matchingPrincipleTI, entropyToScalar, predictabilityToScalar, OSCILLATION_THRESHOLD } from './matching.js';
export type {
  // Input types
  EnvironmentEntropy,
  EnvironmentPredictability,
  Stakes,
  ContextRelevance,
  CommitmentStyle,
  Platform,
  AgentEnvironment,
  TaskDescriptor,
  RecommendInput,
  // Output types
  ReceiverProfile,
  PlatformParameters,
  ToolUseStrategy,
  RetryStrategy,
  ContextStrategy,
  PredictedRegime,
  Confidence,
  Recommendation,
} from './types.js';

// ── Perception layer (model proposes, deterministic RPCS-1 disposes) ──
export {
  AnthropicBackend,
  MockBackend,
  sanitizePerception,
  readingsToFactors,
  entitiesToRecovered,
} from './perception.js';
export type {
  ModelBackend,
  PerceptionResult,
  PerceivedReading,
  PerceivedEntity,
  AnthropicBackendOptions,
} from './perception.js';
export { GatewayBackend } from './perception-gateway.js';
export type { GatewayBackendOptions } from './perception-gateway.js';

// ── Translator (canonical engine — web re-exports this) ─────
export {
  interpret,
  interpretWithModel,
  normalize,
  split,
  rewrite,
  route,
  score,
  resolveAmbiguity,
  rewriteForProfile,
  directivesToInstructions,
} from './translator.js';
export type {
  TranslationOutput,
  InterpretModelOptions,
  NormalizeResult,
  SplitResult,
  RewriteResult,
  RouteResult,
  ScoreResult,
  HatpFactors,
  RiskCategory,
  ARLevel,
  RecoveredEntity,
  EntityCandidate,
  RecoveredIntent,
} from './translator.js';

// ── Intake (user-side receiver profiling + self-vs-observed mirror) ──
export {
  INTAKE_ITEMS,
  scoreIntake,
  deriveRenderingDirectives,
  buildProfileCard,
  updateProfile,
  profileDivergence,
} from './intake.js';
export type {
  PrimitiveKey,
  IntakeOption,
  IntakeItem,
  IntakeAnswers,
  RenderingDirectives,
  ProfileCard,
  ProfileDivergence,
} from './intake.js';

// ── Interpretation Mirror (deterministic fork detectors, SendRight) ──
export { mirror, applyReading } from './mirror.js';
export type { MirrorResult, AmbiguousSpan, ForkReading, ForkKind } from './mirror.js';

// ── Hand-off (deep-link prefill into the user's own model app) ──
export { buildHandoff, listVendors, VENDOR_CAPABILITIES } from './handoff.js';
export type { VendorId, VendorCapability, HandoffPlan, HandoffMethod } from './handoff.js';

// ── Receiver personas + panel ranking (SendRight model panel) ──
export { PERSONAS, rankPersonas } from './personas.js';
export type { PersonaCard, PersonaGrade, PersonaStat, TraitVector, RankedPersona, PanelResult } from './personas.js';

// ── Sprawl analysis (discourse-level: asks, topics, flips, contradictions) ──
export { analyzeSprawl } from './sprawl.js';
export type { SprawlResult, SprawlSegment, PerspectiveFlip, Conflict, Frame } from './sprawl.js';
