import { describe, expect, it } from 'vitest';
import { LANDING_COPY } from '../lib/landing-copy';
import { PROFILE_ORDER } from '../lib/profiles';

describe('landing copy — register variants', () => {
  it('covers every reading profile', () => {
    for (const key of PROFILE_ORDER) {
      expect(LANDING_COPY[key], key).toBeDefined();
    }
  });

  it('every register has a non-empty sub, exactly three non-empty beats, and a non-empty dials line', () => {
    for (const key of PROFILE_ORDER) {
      const c = LANDING_COPY[key];
      expect(c.sub.trim().length, key).toBeGreaterThan(0);
      expect(c.beats).toHaveLength(3);
      for (const b of c.beats) expect(b.trim().length, key).toBeGreaterThan(0);
      expect(c.dials.trim().length, key).toBeGreaterThan(0);
    }
  });

  it('registers are actually distinct (no copy-paste laziness)', () => {
    const subs = PROFILE_ORDER.map((k) => LANDING_COPY[k].sub);
    expect(new Set(subs).size).toBe(subs.length);
    const dials = PROFILE_ORDER.map((k) => LANDING_COPY[k].dials);
    expect(new Set(dials).size).toBe(dials.length);
  });

  it('BINDING DESIGN RULE: no offer content in the register dictionary', () => {
    // The register varies, the facts never do — and prices/tiers are facts
    // that must render from a single source. Structural enforcement.
    for (const key of PROFILE_ORDER) {
      const all = [LANDING_COPY[key].sub, ...LANDING_COPY[key].beats, LANDING_COPY[key].dials].join(' ');
      expect(all.includes('$'), `${key}: contains a price`).toBe(false);
      expect(/\bfree\b/i.test(all), `${key}: contains offer language`).toBe(false);
      expect(/\btier\b|\bplan\b|\bpricing\b/i.test(all), `${key}: contains offer language`).toBe(false);
    }
  });

  it('the dials copy never promises the values stay put unconditionally — they travel inside a sent message', () => {
    // Honesty ratchet: the values DO leave the browser when the user sends.
    for (const key of PROFILE_ORDER) {
      const d = LANDING_COPY[key].dials;
      expect(d).not.toMatch(/never leave/i);
    }
  });
});
