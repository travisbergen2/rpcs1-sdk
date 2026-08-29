import { describe, expect, it } from 'vitest';
import {
  clampResponseDelay,
  DEFAULT_PREFS,
  dictationHint,
  loadPrefs,
  normalizeTextScale,
  paceMs,
  savePrefs,
  TEXT_SCALE_FACTORS,
} from '../lib/loop-prefs';

function fakeStore(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    dump: () => Object.fromEntries(m),
  };
}

describe('normalizeTextScale / factors', () => {
  it('accepts valid scales, defaults everything else', () => {
    expect(normalizeTextScale('large')).toBe('large');
    expect(normalizeTextScale('larger')).toBe('larger');
    expect(normalizeTextScale('massive')).toBe('default');
    expect(normalizeTextScale(undefined)).toBe('default');
  });
  it('factors are finite and ≥ 1', () => {
    for (const k of ['default', 'large', 'larger'] as const) {
      expect(TEXT_SCALE_FACTORS[k]).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('clampResponseDelay / paceMs — floor, not addend', () => {
  it('clamps and rejects garbage', () => {
    expect(clampResponseDelay(2000)).toBe(2000);
    expect(clampResponseDelay(99999)).toBe(5000);
    expect(clampResponseDelay(-1)).toBe(0);
    expect(clampResponseDelay('1000')).toBe(0);
  });
  it('slow requests already satisfy the floor', () => {
    expect(paceMs(2000, 300)).toBe(1700);
    expect(paceMs(2000, 2500)).toBe(0);
    expect(paceMs(0, 100)).toBe(0);
    expect(paceMs(1000, NaN)).toBe(1000);
  });
});

describe('dictationHint', () => {
  it('coarse pointer only', () => {
    expect(dictationHint(true)).toMatch(/mic key/);
    expect(dictationHint(false)).toBeNull();
  });
});

describe('prefs persistence (injectable storage)', () => {
  it('round-trips valid prefs', () => {
    const s = fakeStore();
    savePrefs(s, { textScale: 'large', responseDelayMs: 1000 });
    expect(loadPrefs(s)).toEqual({ textScale: 'large', responseDelayMs: 1000 });
  });
  it('normalizes junk on load', () => {
    const s = fakeStore({ 'ef-loop-prefs-v1': '{"textScale":"huge","responseDelayMs":"soon"}' });
    expect(loadPrefs(s)).toEqual(DEFAULT_PREFS);
  });
  it('survives corrupt JSON and null store', () => {
    const s = fakeStore({ 'ef-loop-prefs-v1': '{not json' });
    expect(loadPrefs(s)).toEqual(DEFAULT_PREFS);
    expect(loadPrefs(null)).toEqual(DEFAULT_PREFS);
    savePrefs(null, DEFAULT_PREFS); // must not throw
  });
});
