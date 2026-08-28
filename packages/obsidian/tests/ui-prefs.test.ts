import { describe, expect, it } from 'vitest';
import {
  clampResponseDelay,
  dictationHint,
  normalizeTextScale,
  paceMs,
  srSpanLabel,
  TEXT_SCALE_FACTORS,
} from '../src/ui-prefs.js';

describe('normalizeTextScale', () => {
  it('accepts the three valid scales', () => {
    expect(normalizeTextScale('default')).toBe('default');
    expect(normalizeTextScale('large')).toBe('large');
    expect(normalizeTextScale('larger')).toBe('larger');
  });

  it('falls back to default on anything else (old data.json, corruption)', () => {
    expect(normalizeTextScale(undefined)).toBe('default');
    expect(normalizeTextScale(null)).toBe('default');
    expect(normalizeTextScale(1.3)).toBe('default');
    expect(normalizeTextScale('huge')).toBe('default');
  });

  it('every scale has a finite factor ≥ 1', () => {
    for (const k of ['default', 'large', 'larger'] as const) {
      expect(TEXT_SCALE_FACTORS[k]).toBeGreaterThanOrEqual(1);
      expect(Number.isFinite(TEXT_SCALE_FACTORS[k])).toBe(true);
    }
  });
});

describe('clampResponseDelay', () => {
  it('passes through valid delays', () => {
    expect(clampResponseDelay(0)).toBe(0);
    expect(clampResponseDelay(1000)).toBe(1000);
    expect(clampResponseDelay(2000)).toBe(2000);
  });

  it('clamps to the 5000 ms ceiling', () => {
    expect(clampResponseDelay(60_000)).toBe(5000);
  });

  it('rejects garbage to 0 (off)', () => {
    expect(clampResponseDelay(-500)).toBe(0);
    expect(clampResponseDelay(NaN)).toBe(0);
    expect(clampResponseDelay('2000')).toBe(0);
    expect(clampResponseDelay(undefined)).toBe(0);
  });
});

describe('paceMs — pacing is a floor, not an addend', () => {
  it('waits the remainder when the request was faster than the floor', () => {
    expect(paceMs(2000, 300)).toBe(1700);
  });

  it('waits nothing when the request already took longer than the floor', () => {
    expect(paceMs(2000, 3100)).toBe(0);
  });

  it('is 0 when pacing is off', () => {
    expect(paceMs(0, 0)).toBe(0);
    expect(paceMs(0, 500)).toBe(0);
  });

  it('treats invalid elapsed as 0 elapsed', () => {
    expect(paceMs(1000, NaN)).toBe(1000);
    expect(paceMs(1000, -50)).toBe(1000);
  });
});

describe('srSpanLabel — provenance only, never confidence', () => {
  it('announces locked state', () => {
    expect(srSpanLabel('bring the ladder', true)).toBe('bring the ladder — locked');
  });

  it('announces a rewrite for unlocked revised lines', () => {
    expect(srSpanLabel('bring the ladder', false, 'revised')).toBe(
      'bring the ladder — rewritten this round',
    );
  });

  it('kept + unlocked is just the text (aria-pressed carries the rest)', () => {
    expect(srSpanLabel('bring the ladder', false, 'kept')).toBe('bring the ladder');
    expect(srSpanLabel('bring the ladder', false)).toBe('bring the ladder');
  });

  it('locked wins over revised (a locked line is never announced as rewritten)', () => {
    expect(srSpanLabel('x', true, 'revised')).toBe('x — locked');
  });
});

describe('dictationHint', () => {
  it('present on mobile, absent on desktop', () => {
    expect(dictationHint(true)).toMatch(/mic key/);
    expect(dictationHint(false)).toBeNull();
  });
});
