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
