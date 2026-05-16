/**
 * Matching Principle implementation (Pred-09-5 from RPCS-1).
 *
 * Stable receivers in an environment with entropy H satisfy TI ~ 1/H.
 * This file provides lookup-table interpolation from the matching.json config.
 */

import matchingConfig from '../config/matching.json';

interface TiEntry {
  H: number;
  TI: number;
  regime_label: string;
}

/**
 * Given environmental entropy H in [0, 1], return the recommended
 * Temporal Integration window TI in [0, 100].
 *
 * Uses linear interpolation between the lookup table entries in matching.json.
 * Clamps at the endpoints for H < 0.1 or H > 0.95.
 */
export function matchingPrincipleTI(H: number): number {
  const table: TiEntry[] = matchingConfig.ti_for_h;

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
