/**
 * Regime evaluation, reasoning generation, and warning detection.
 *
 * All functions are pure and deterministic. The reasoning string always
 * traces back to a named IMM principle, config threshold, or primitive value.
 */

import {
  ReceiverProfile,
  PlatformParameters,
  RecommendInput,
  PredictedRegime,
  Confidence,
} from './types';
import { OSCILLATION_THRESHOLD } from './matching';

// ─── Regime evaluation ────────────────────────────────────────────────────────

/**
 * Evaluate predicted stability regime from receiver profile.
 *
 * Boundary conditions from RPCS-1 / neurotypes.json:
 *   - near_oscillation: TI >= 65 AND SG >= 55
 *   - near_overload:    TI <= 35 AND SG >= 65
 *   - near_freeze:      UE <= 35 AND FT >= 65
 *   - stable:           none of the above
 */
export function evaluateRegime(profile: ReceiverProfile): PredictedRegime {
  const { TI, SG, FT, UE } = profile;

  if (TI >= 65 && SG >= 55) return 'near_oscillation';
  if (TI <= 35 && SG >= 65) return 'near_overload';
  if (UE <= 35 && FT >= 65) return 'near_freeze';
  return 'stable';
}

// ─── Warning detection ────────────────────────────────────────────────────────

export function generateWarnings(
  profile: ReceiverProfile,
  input: RecommendInput,
): string[] {
  const warnings: string[] = [];
  const { TI, SG, FT, UE, AR } = profile;

  // Oscillation threshold: Paper 9 §oscillatory threshold
  const sgTiProduct = SG * TI;
  if (sgTiProduct > OSCILLATION_THRESHOLD) {
    warnings.push(
      `Oscillation risk: SG (${SG}) × TI (${TI}) = ${sgTiProduct} exceeds the RPCS-1 ` +
      `oscillation threshold (${OSCILLATION_THRESHOLD}). Consider reducing SG or TI.`,
    );
  }

  // Overload risk: high SG + low FT + low TI
  if (SG >= 60 && FT <= 30 && TI <= 30) {
    warnings.push(
      `Overload risk: High SG (${SG}) + low FT (${FT}) + low TI (${TI}) — ` +
      `agent may act on insufficient information. Raise FT or lower SG.`,
    );
  }

  // Freeze risk: low UE + high FT
  if (UE <= 30 && FT >= 70) {
    warnings.push(
      `Freeze risk: Low UE (${UE}) + high FT (${FT}) — ` +
      `agent may hedge endlessly without acting. Lower FT or raise UE.`,
    );
  }

  // High-stakes + high AR mismatch
  if (
    (input.environment.stakes === 'high' || input.environment.stakes === 'catastrophic') &&
    AR >= 65
  ) {
    warnings.push(
      `High stakes (${input.environment.stakes}) + high AR (${AR}) — ` +
      `aggressive ambiguity resolution in a high-stakes environment increases error risk.`,
    );
  }

  // Chaotic environment + long context relevance → integration mismatch
  if (input.environment.entropy === 'chaotic' && input.environment.context_relevance === 'long') {
    warnings.push(
      `Environment-context mismatch: chaotic entropy calls for short TI (Matching Principle), ` +
      `but long context_relevance requests long integration. ` +
      `This configuration is structurally near the oscillation boundary.`,
    );
  }

  // TI floor binding: at dynamic/chaotic entropy (H >= 0.27), TI clips to TI_MIN.
  // Pred-09-5 validated with large effect sizes only at H <= 0.27 (stable entropy).
  // Above this threshold, IMM-tuned and hand-tuned parameters converge — the
  // Matching Principle loses resolution. This is a floor-binding artifact, not a
  // failure of the prediction. (Benchmark study: Pred-09-5 validation, May 2026.)
  if (input.environment.entropy === 'dynamic' || input.environment.entropy === 'chaotic') {
    warnings.push(
      `TI floor binding: at ${input.environment.entropy} entropy (H ≥ 0.27), ` +
      `TI clips to its minimum value and the Matching Principle (Pred-09-5) operates ` +
      `near its resolution limit. Recommendations remain valid but effect sizes are ` +
      `smaller than at stable/moderate entropy. Consider raising K_IMM or increasing ` +
      `TI_MIN if performance gains are insufficient.`,
    );
  }

  return warnings;
}

// ─── Reasoning string ─────────────────────────────────────────────────────────

export function generateReasoning(
  input: RecommendInput,
  profile: ReceiverProfile,
  params: PlatformParameters,
): string {
  const { TI, SG, FT, UE, AR } = profile;
  const { entropy, stakes, commitment_style, context_relevance } = input.environment;
  const { temperature, max_tokens, context_strategy } = params;

  return (
    `Environment analysis: ${entropy} entropy → Matching Principle (Pred-09-5: TI ~ 1/H) ` +
    `yields TI = ${TI} (${describeLevel(TI)} temporal integration window). ` +
    `${stakes} stakes drive SG = ${SG} (${describeLevel(SG)} signal gain) and ` +
    `FT = ${FT} (${describeLevel(FT)} filtering threshold) for basin stability. ` +
    `${commitment_style} commitment style sets AR = ${AR}; ` +
    `${context_relevance} context relevance + entropy set UE = ${UE}. ` +
    `Platform mapping: temperature = ${temperature} (from SG via 1/SG relationship), ` +
    `max_tokens = ${max_tokens} (from TI), context_strategy = ${context_strategy}.`
  );
}

function describeLevel(value: number): string {
  if (value >= 70) return 'high';
  if (value >= 40) return 'moderate';
  return 'low';
}

// ─── IMM principles applied ───────────────────────────────────────────────────

export function listPrinciplesApplied(
  input: RecommendInput,
  profile: ReceiverProfile,
): string[] {
  const principles = [
    'Matching Principle (Pred-09-5): TI ~ 1/H',
    'Basin Stability: minimize V(R,E) subject to task constraints',
    'Boundary Avoidance: stay away from oscillation/overload/freeze regimes',
  ];

  if (profile.SG * profile.TI > OSCILLATION_THRESHOLD * 0.8) {
    principles.push('Oscillation Threshold (Paper 9 §oscillatory threshold): SG × TI < Δ_R');
  }

  if (input.environment.stakes === 'high' || input.environment.stakes === 'catastrophic') {
    principles.push('Conservative Gating (high-stakes): raise FT, lower SG to prevent overload');
  }

  return principles;
}

// ─── Confidence assessment ────────────────────────────────────────────────────

export function assessConfidence(input: RecommendInput): Confidence {
  const { task, environment } = input;
  let score = 0;

  if (task.domain) score++;
  if (task.expected_duration_per_call) score++;
  // All environment fields are required, so they always contribute
  score += 3;

  if (score >= 4) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}
