import { describe, it, expect } from 'vitest';
import { computeReceiverProfile, computeSG, computeFT, computeUE, computeAR } from '../src/primitives';
import { matchingPrincipleTI, entropyToScalar } from '../src/matching';

describe('matchingPrincipleTI', () => {
  it('H=0.1 → TI=90 (long deep integration)', () => {
    expect(matchingPrincipleTI(0.1)).toBe(90);
  });
  it('H=0.95 → TI=10 (rapid response)', () => {
    expect(matchingPrincipleTI(0.95)).toBe(10);
  });
  it('H=0.5 → TI=50 (balanced)', () => {
    expect(matchingPrincipleTI(0.5)).toBe(50);
  });
  it('interpolates between table entries', () => {
    // Between H=0.25 (TI=70) and H=0.5 (TI=50): midpoint H=0.375 → TI≈60
    const TI = matchingPrincipleTI(0.375);
    expect(TI).toBeGreaterThan(55);
    expect(TI).toBeLessThan(70);
  });
  it('clamps below minimum H', () => {
    expect(matchingPrincipleTI(0.0)).toBe(90);
  });
  it('clamps above maximum H', () => {
    expect(matchingPrincipleTI(1.0)).toBe(10);
  });
});

describe('computeSG', () => {
  it('catastrophic stakes → very low SG', () => {
    expect(computeSG('catastrophic', 0.5)).toBeLessThan(30);
  });
  it('low stakes + high predictability → higher SG', () => {
    const sg = computeSG('low', 0.9);
    expect(sg).toBeGreaterThan(60);
  });
  it('result is in [0, 100]', () => {
    expect(computeSG('catastrophic', 0.0)).toBeGreaterThanOrEqual(0);
    expect(computeSG('low', 1.0)).toBeLessThanOrEqual(100);
  });
});

describe('computeFT', () => {
  it('catastrophic + cautious → FT ≥ 90', () => {
    expect(computeFT('catastrophic', 'cautious')).toBeGreaterThanOrEqual(90);
  });
  it('low + decisive → low FT', () => {
    expect(computeFT('low', 'decisive')).toBeLessThan(30);
  });
  it('result is in [0, 100]', () => {
    expect(computeFT('catastrophic', 'cautious')).toBeLessThanOrEqual(100);
    expect(computeFT('low', 'decisive')).toBeGreaterThanOrEqual(0);
  });
});

describe('computeUE', () => {
  it('chaotic (H=0.95) + short context → high UE', () => {
    expect(computeUE(0.95, 'short')).toBeGreaterThan(70);
  });
  it('stable (H=0.2) + long context → low UE', () => {
    expect(computeUE(0.2, 'long')).toBeLessThan(30);
  });
  it('result is in [0, 100]', () => {
    expect(computeUE(0.0, 'long')).toBeGreaterThanOrEqual(0);
    expect(computeUE(1.0, 'short')).toBeLessThanOrEqual(100);
  });
});

describe('computeAR', () => {
  it('decisive + low → high AR', () => {
    expect(computeAR('decisive', 'low')).toBeGreaterThan(65);
  });
  it('cautious + catastrophic → very low AR', () => {
    expect(computeAR('cautious', 'catastrophic')).toBeLessThan(20);
  });
  it('result is in [0, 100]', () => {
    expect(computeAR('decisive', 'low')).toBeLessThanOrEqual(100);
    expect(computeAR('cautious', 'catastrophic')).toBeGreaterThanOrEqual(0);
  });
});

describe('computeReceiverProfile', () => {
  it('returns all five primitives in [0, 100]', () => {
    const profile = computeReceiverProfile(
      {
        entropy:           'dynamic',
        predictability:    'somewhat_predictable',
        stakes:            'medium',
        context_relevance: 'medium',
        commitment_style:  'balanced',
      },
      { task_summary: 'test' },
    );
    for (const key of ['TI', 'SG', 'FT', 'UE', 'AR'] as const) {
      expect(profile[key]).toBeGreaterThanOrEqual(0);
      expect(profile[key]).toBeLessThanOrEqual(100);
    }
  });
});
