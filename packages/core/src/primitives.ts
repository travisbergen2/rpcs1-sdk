/**
 * Five RPCS-1 receiver primitives computed from environment + task.
 *
 * All computations are deterministic, explainable lookups or weighted
 * calculations. No ML models. Every output traces back to a config value
 * or an IMM principle.
 *
 * Principles applied:
 *   - Matching Principle (Pred-09-5): TI ~ 1/H
 *   - Basin Stability:   minimize V(R,E) — stay away from oscillation/overload/freeze
 *   - Boundary Avoidance: warn when SG × TI exceeds the oscillation threshold
 */

import {
  AgentEnvironment,
  TaskDescriptor,
  ReceiverProfile,
  Stakes,
  CommitmentStyle,
  ContextRelevance,
} from './types.js';
import {
  matchingPrincipleTI,
  entropyToScalar,
  predictabilityToScalar,
} from './matching.js';

// ─── SG: Signal Gain ─────────────────────────────────────────────────────────
// High stakes → lower SG (don't over-amplify, risk of overload)
// High predictability → slightly higher SG (signal is reliable)

const SG_STAKES_BASE: Record<Stakes, number> = {
  low:          70,
  medium:       55,
  high:         35,
  catastrophic: 20,
};

export function computeSG(stakes: Stakes, predictability: number): number {
  const base = SG_STAKES_BASE[stakes];
  // Predictability in [0,1]; adds up to ±10
  const adjustment = Math.round((predictability - 0.5) * 20);
  return Math.min(100, Math.max(0, base + adjustment));
}

// ─── FT: Filtering Threshold ─────────────────────────────────────────────────
// High stakes → higher FT (more conservative gating)
// Cautious commitment → higher FT

const FT_STAKES_BASE: Record<Stakes, number> = {
  low:          25,
  medium:       40,
  high:         60,
  catastrophic: 80,
};

const FT_COMMITMENT_DELTA: Record<CommitmentStyle, number> = {
  decisive: -10,
  balanced:   0,
  cautious:  15,
};

export function computeFT(stakes: Stakes, commitment_style: CommitmentStyle): number {
  const base = FT_STAKES_BASE[stakes];
  const delta = FT_COMMITMENT_DELTA[commitment_style];
  return Math.min(100, Math.max(0, base + delta));
}

// ─── UE: Update Elasticity ───────────────────────────────────────────────────
// High entropy → higher UE (update faster)
// Long context relevance → lower UE (don't churn the context)

const UE_CONTEXT_DELTA: Record<ContextRelevance, number> = {
  short:  15,
  medium:  0,
  long:  -15,
};

export function computeUE(H: number, context_relevance: ContextRelevance): number {
  // H in [0,1] → UE base in [20, 80]
  const base = Math.round(20 + H * 60);
  const delta = UE_CONTEXT_DELTA[context_relevance];
  return Math.min(100, Math.max(0, base + delta));
}

// ─── AR: Ambiguity Resolution ─────────────────────────────────────────────────
// Decisive commitment → higher AR (commit when ambiguous)
// Cautious commitment + high stakes → lower AR (defer when ambiguous)

const AR_COMMITMENT_BASE: Record<CommitmentStyle, number> = {
  decisive: 70,
  balanced: 50,
  cautious: 30,
};

const AR_STAKES_DELTA: Record<Stakes, number> = {
  low:           5,
  medium:        0,
  high:        -10,
  catastrophic: -20,
};

export function computeAR(commitment_style: CommitmentStyle, stakes: Stakes): number {
  const base = AR_COMMITMENT_BASE[commitment_style];
  const delta = AR_STAKES_DELTA[stakes];
  return Math.min(100, Math.max(0, base + delta));
}

// ─── Top-level: compute full ReceiverProfile ─────────────────────────────────

export function computeReceiverProfile(
  environment: AgentEnvironment,
  _task: TaskDescriptor,
): ReceiverProfile {
  const H = entropyToScalar(environment.entropy);
  const P = predictabilityToScalar(environment.predictability);

  const TI = matchingPrincipleTI(H);
  const SG = computeSG(environment.stakes, P);
  const FT = computeFT(environment.stakes, environment.commitment_style);
  const UE = computeUE(H, environment.context_relevance);
  const AR = computeAR(environment.commitment_style, environment.stakes);

  return { TI, SG, FT, UE, AR };
}
