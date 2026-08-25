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
  ReceiverEvidenceSummary,
  ToolUseStrategy,
  RetryStrategy,
  ContextStrategy,
  PredictedRegime,
  Confidence,
  Recommendation,
} from './types.js';


// ── Measured per-model receiver table (E-LIT program) ──
export {
  RECEIVER_TABLE,
  RECEIVER_TABLE_VERSION,
  RECEIVER_TABLE_MEASURED,
  RECEIVER_TABLE_SCOPE,
  normalizeModelId,
  lookupReceiver,
  receiverDirectives,
  receiverEvidence,
  applyReceiverPosture,
} from './receivers.js';
export type {
  ReceiverEntry,
  EvidenceGrade,
  LadderClass,
  ChannelGain,
  ReceiverEvidence,
} from './receivers.js';

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

// ── Entropy Routing (commit-vs-clarify over competing interpretations) ──
export {
  shannonEntropy,
  computePosterior,
  updatePosterior,
  scoreLexicalLikelihoods,
  thresholdsFromProfile,
  routeByEntropy,
  routeIntent,
  DEFAULT_INTENT_HYPOTHESES,
} from './routing.js';
export type {
  IntentHypothesis,
  Likelihoods,
  PosteriorEntry,
  Posterior,
  RoutingMode,
  RoutingThresholds,
  RoutingDecision,
  RouteIntentOptions,
} from './routing.js';

// ── Interpretation Mirror (deterministic fork detectors, SendRight) ──
export { mirror, applyReading } from './mirror.js';
export type { MirrorResult, AmbiguousSpan, ForkReading, ForkKind } from './mirror.js';

// ── Sculpt (whole-prompt guidance: thesaurus-in-the-chat-box, v0 rules) ──
export { buildSculpt } from './sculpt.js';
export { SCULPT_SUBS } from './sculpt-lexicon.js';
export type { SculptChange, SculptSpan, SculptResult } from './sculpt.js';
export type { SculptSub } from './sculpt-lexicon.js';

// ── Fork View (receiver-side: mirror floor + model branch-grower) ──
export { buildForkView } from './fork.js';
export type { ForkBranch, ForkViewStatus, ForkViewResult, ForkViewOptions } from './fork.js';

// ── Hand-off (deep-link prefill into the user's own model app) ──
export { buildHandoff, listVendors, VENDOR_CAPABILITIES } from './handoff.js';
export type { VendorId, VendorCapability, HandoffPlan, HandoffMethod } from './handoff.js';

// ── Receiver personas + panel ranking (SendRight model panel) ──
export { PERSONAS, rankPersonas } from './personas.js';
export type { PersonaCard, PersonaGrade, PersonaStat, TraitVector, RankedPersona, PanelResult } from './personas.js';

// ── Sprawl analysis (discourse-level: asks, topics, flips, contradictions) ──
export { analyzeSprawl } from './sprawl.js';
export type { SprawlResult, SprawlSegment, PerspectiveFlip, Conflict, Frame } from './sprawl.js';

// ── Bridge axes (Full-Duplex Bridge spec v0.2 — coordinate transforms) ──
export { AXES, IDENTITY_COORDS, applyAxes } from './axes.js';
export type { AxisId, AxisDef, AxisCoords, AxisMove, ApplyResult } from './axes.js';

// ── The Loop (elected-span interpretation ratchet — Phase A hero) ──
export {
  normalizeSpanText,
  segmentSentences,
  spansFromTexts,
  buildLoopMessages,
  parseLoopResponse,
  verifyRatchet,
  repairRatchet,
  finalizeRound,
  assemblePrompt,
  capContextSnippets,
  CONTEXT_SNIPPET_LIMITS,
  LOOP_SYSTEM_PROMPT,
  LOOP_ANSWER_GUARD,
} from './loop.js';
export type {
  LoopSpan,
  LoopRoundResult,
  LoopMessages,
  ParsedLoopResponse,
  RatchetCheck,
  ContextSnippet,
} from './loop.js';

// ── Vault grounding primitives (shared by the Obsidian plugin + vault-mcp) ──
export {
  SELECT_CAPS,
  MIN_SCORE,
  tokenize,
  lexicalScore,
  graphScore,
  recencyScore,
  scoreCandidate,
  excerptAround,
  isAllowed,
  selectSnippets,
  slugify,
  wikilink,
} from './vault-select.js';
export type {
  CandidateNote,
  SelectedSnippet,
  SelectionLogEntry,
  SelectionResult,
} from './vault-select.js';
