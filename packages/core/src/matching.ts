/**
 * Matching-law implementation (R-1 family, IMM Paper 18 — supersedes Pred-09-5).
 *
 * Derived direction: well-tuned receivers integrate less as the environment's
 * change rate rises (forced by bias–variance under any convex loss). The exact
 * TI ∝ 1/H scaling is conditional on change detection; H → change rate is an
 * identification (A-OR-5), stated honestly.
 * This file provides the product's operationalization: lookup-table
 * interpolation from the matching config.
 */

interface TiEntry {
  H: number;
  TI: number;
  regime_label: string;
}

const matchingConfig = {
  ti_for_h: [
    { H: 0.1, TI: 90, regime_label: 'long deep integration' },
    { H: 0.25, TI: 70, regime_label: 'stable integration' },
    { H: 0.5, TI: 50, regime_label: 'balanced integration' },
    { H: 0.75, TI: 30, regime_label: 'responsive integration' },
    { H: 0.95, TI: 10, regime_label: 'rapid response' },
  ],
  oscillation_threshold: {
    max_product_SG_TI: 7000,
  },
  entropy_scalars: {
    stable: 0.2,
    moderate: 0.5,
    dynamic: 0.75,
    chaotic: 0.95,
  },
  predictability_scalars: {
    highly_predictable: 0.9,
    somewhat_predictable: 0.55,
    unpredictable: 0.2,
  },
} as const;

/**
 * Given environmental entropy H in [0, 1], return the recommended
 * Temporal Integration window TI in [0, 100].
 *
 * Uses linear interpolation between the lookup table entries in the matching config.
 * Clamps at the endpoints for H < 0.1 or H > 0.95.
 */
export function matchingPrincipleTI(H: number): number {
  const table: readonly TiEntry[] = matchingConfig.ti_for_h;

  // Clamp below
  if (H <= table[0].H) return table[0].TI;
  // Clamp above
  if (H >= table[table.length - 1].H) return table[table.length - 1].TI;

  // Find surrounding bracket
  for (let i = 0; i < table.length - 1; i++) {
    const lo = table[i];
    const hi = table[i + 1];
    if (H >= lo.H && H <= hi.H) {
      const t = (H - lo.H) / (hi.H - lo.H);
      return Math.round(lo.TI + t * (hi.TI - lo.TI));
    }
  }

  // Fallback (should not reach)
  return 50;
}

export function entropyToScalar(entropy: string): number {
  const scalars = matchingConfig.entropy_scalars as Record<string, number>;
  return scalars[entropy] ?? 0.5;
}

export function predictabilityToScalar(predictability: string): number {
  const scalars = matchingConfig.predictability_scalars as Record<string, number>;
  return scalars[predictability] ?? 0.55;
}

export const OSCILLATION_THRESHOLD: number =
  matchingConfig.oscillation_threshold.max_product_SG_TI;
