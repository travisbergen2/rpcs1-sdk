export { recommend } from './recommend';
export { computeReceiverProfile } from './primitives';
export { mapToParameters } from './platforms';
export { evaluateRegime, generateReasoning, generateWarnings, listPrinciplesApplied, assessConfidence } from './analysis';
export { matchingPrincipleTI, entropyToScalar, predictabilityToScalar, OSCILLATION_THRESHOLD } from './matching';
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
} from './types';
