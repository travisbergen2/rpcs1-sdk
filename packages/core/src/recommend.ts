/**
 * Top-level recommendation function.
 *
 * Orchestrates: primitives → platform mapping → regime evaluation → reasoning.
 * All steps are deterministic and explainable.
 */

import { RecommendInput, Recommendation } from './types.js';
import { computeReceiverProfile } from './primitives.js';
import { mapToParameters } from './platforms.js';
import {
  evaluateRegime,
  generateReasoning,
  generateWarnings,
  listPrinciplesApplied,
  assessConfidence,
} from './analysis.js';

export function recommend(input: RecommendInput): Recommendation {
  // 1. Compute the five RPCS-1 receiver primitives from environment + task
  const receiver_profile = computeReceiverProfile(input.environment, input.task);

  // 2. Map primitives to platform-specific LLM parameters
  const platform_parameters = mapToParameters(receiver_profile, input.target_platform);

  // 3. Evaluate the predicted stability regime
  const predicted_regime = evaluateRegime(receiver_profile);

  // 4. Generate a human-readable reasoning trace citing IMM principles
  const reasoning = generateReasoning(input, receiver_profile, platform_parameters);

  // 5. Flag any configurations near failure-regime boundaries
  const warnings = generateWarnings(receiver_profile, input);

  // 6. List the IMM principles applied
  const imm_principles_applied = listPrinciplesApplied(input, receiver_profile);

  // 7. Assess confidence based on input completeness
  const confidence = assessConfidence(input);

  return {
    receiver_profile,
    platform_parameters,
    predicted_regime,
    reasoning,
    warnings,
    imm_principles_applied,
    confidence,
  };
}
