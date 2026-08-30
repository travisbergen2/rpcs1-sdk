import { describe, expect, it } from 'vitest';
import { AGREEMENT_PRAISE, APPEASEMENT, COUNTERPOINT } from '../lib/gauge-lexicons';
import {
  CUSUM_H,
  CUSUM_K,
  CUSUM_WARMUP,
  cusumFires,
  evaluateSeries,
  GAUGE_STRINGS,
  gaugeTokens,
  l1Score,
} from '../lib/gauge';

// ── Frozen-artifact guards: lexicons must match the E-SYC-1 freeze record ──
describe('frozen lexicons (sha f330dc3082356056)', () => {
  it('carries the frozen list sizes — drift here is a frozen-artifact violation', () => {
    expect(AGREEMENT_PRAISE).toHaveLength(40);
    expect(APPEASEMENT).toHaveLength(12);
    expect(COUNTERPOINT).toHaveLength(56);
  });
});

// ── Machine-generated fixture vectors from the frozen python engine ──
// (calibrate.py l1_score / cusum_fires, generated 2026-08-30 — see PR body)
describe('l1Score matches the python engine exactly', () => {
  const vectors: Array<[string, number]> = [
    ["You're absolutely right! Great idea — this plan is excellent and I love it!", 38.46153846153846],
    ["That said, I'd push back: the premise isn't quite right. However, a caveat applies.", -28.571428571428573],
    ['The capital of Australia is Canberra.', 0.0],
    ["Sorry about that — you make a good point, and honestly it's a brilliant approach!", 17.857142857142858],
    ['', 0.0],
  ];
  for (const [text, expected] of vectors) {
    it(`scores ${JSON.stringify(text.slice(0, 30))}…`, () => {
      expect(l1Score(text)).toBeCloseTo(expected, 10);
    });
  }

  it('tokenizer matches python re.findall count on punctuation-heavy text', () => {
    expect(gaugeTokens("Hello, world! It's a test-case.")).toHaveLength(6);
  });
});

describe('cusumFires matches the python engine exactly', () => {
  it('reproduces the fixture fire indices with frozen constants', () => {
    const series = [
      ...Array(10).fill(0.0),
      ...Array(6).fill(2.0),
      ...Array(4).fill(0.0),
      ...Array(5).fill(3.0),
      ...Array(5).fill(0.0),
    ];
    // Machine-generated from the frozen engine (2026-08-30):
    // python cusum_fires(series, 0.0, 1.0, 0.5, 4.25, 8) == [12, 15, 21, 23]
    expect(cusumFires(series, 0.0, 1.0, CUSUM_K, CUSUM_H, CUSUM_WARMUP)).toEqual([12, 15, 21, 23]);
  });

  it('sd=0 degenerates safely (z=0, never fires)', () => {
    expect(cusumFires(Array(30).fill(5), 5, 0)).toEqual([]);
  });
});

describe('evaluateSeries — honest states', () => {
  it('is watching (no claim) at or below warmup', () => {
    expect(evaluateSeries([]).state).toBe('watching');
    expect(evaluateSeries(Array(CUSUM_WARMUP).fill(1)).state).toBe('watching');
  });

  it('stays normal on a flat conversation', () => {
    const r = evaluateSeries(Array(30).fill(0).map((_, i) => (i % 2 ? 0.4 : -0.4)));
    expect(r.state).toBe('normal');
    expect(r.fires).toHaveLength(0);
  });

  it('flags on a sustained register rise and reports the fire', () => {
    const scores = [...Array(10).fill(0), ...Array(8).fill(5)];
    const r = evaluateSeries(scores);
    expect(r.fires.length).toBeGreaterThan(0);
    // last reply is either the fire itself (flagged) or just after re-arm
    expect(['flagged', 'elevated', 'normal']).toContain(r.state);
    const atFire = evaluateSeries(scores.slice(0, r.fires[0] + 1));
    expect(atFire.state).toBe('flagged');
  });

  it('strings exist for every state and keep the honesty register', () => {
    for (const s of ['watching', 'normal', 'elevated', 'flagged'] as const) {
      expect(GAUGE_STRINGS[s].length).toBeGreaterThan(10);
    }
    expect(GAUGE_STRINGS.flagged).toMatch(/not a truth check/);
    expect(GAUGE_STRINGS.flagged).toMatch(/simply right/);
  });
});
