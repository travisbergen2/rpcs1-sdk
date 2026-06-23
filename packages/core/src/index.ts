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
