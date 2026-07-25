import { describe, it, expect } from 'vitest';
import { PERSONAS, rankPersonas, type PersonaStat } from '../src/personas';
import { VENDOR_CAPABILITIES, type VendorId } from '../src/handoff';
import type { ForkKind } from '../src/mirror';

const ALL_VENDORS = Object.keys(VENDOR_CAPABILITIES) as VendorId[];

describe('persona cards — claim-integrity gates (ledger discipline as CI)', () => {
  it('every hand-off vendor has a persona card', () => {
    for (const v of ALL_VENDORS) expect(PERSONAS[v], `missing persona for ${v}`).toBeDefined();
  });

  it('v1 ships ALL-provisional: no card may claim measured without a battery run', () => {
    for (const card of Object.values(PERSONAS)) {
      expect(card.grade).toBe('provisional');
      expect(card.sourceNote).toMatch(/provisional/i);
      expect(card.sourceNote).toMatch(/\d{4}-\d{2}-\d{2}/); // dated characterization
    }
  });

  it('NO unsourced numbers: a stat with a value must carry source and asOf; null stats carry neither', () => {
    for (const card of Object.values(PERSONAS)) {
      expect(card.stats.length).toBeGreaterThan(0);
      for (const s of card.stats as PersonaStat[]) {
        if (s.value === null) {
          expect(s.source).toBeNull();
          expect(s.asOf).toBeNull();
        } else {
          expect(s.source, `${card.vendor}/${s.label} has a number without a source`).toBeTruthy();
          expect(s.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }
    }
  });

  it('v1: every stat cell is not-yet-measured (nothing has been measured yet — honesty check)', () => {
    for (const card of Object.values(PERSONAS)) {
      for (const s of card.stats) expect(s.value).toBeNull();
    }
  });

  it('trait estimates stay in [0,100] and are internal-only shapes', () => {
    for (const card of Object.values(PERSONAS)) {
      for (const v of Object.values(card.traits)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it('blurbs are two-line short — no essays on cards', () => {
    for (const card of Object.values(PERSONAS)) {
      expect(card.blurb.length).toBeGreaterThan(30);
      expect(card.blurb.length).toBeLessThan(220);
    }
  });
});

describe('rankPersonas — deterministic panel ordering', () => {
  const kinds: Array<ForkKind | 'as_written'> = [
    'compare_or_choose', 'grouping_fork', 'scope_fork',
    'dangling_pronoun', 'bare_object', 'external_reference', 'as_written',
  ];

  it('returns top-3 plus the rest unranked, covering all vendors exactly once', () => {
    for (const k of kinds) {
      const r = rankPersonas(k);
      expect(r.top).toHaveLength(3);
      expect(r.unranked).toHaveLength(ALL_VENDORS.length - 3);
      const seen = [...r.top.map((x) => x.card.vendor), ...r.unranked.map((x) => x.vendor)].sort();
      expect(seen).toEqual([...ALL_VENDORS].sort());
    }
  });

  it('is deterministic: identical input → identical order', () => {
    for (const k of kinds) {
      expect(rankPersonas(k)).toEqual(rankPersonas(k));
    }
  });

  it('every ranked row is provisional-graded with a why string until a routing test exists', () => {
    for (const k of kinds) {
      for (const row of rankPersonas(k).top) {
        expect(row.grade).toBe('provisional');
        expect(row.why).toMatch(/provisional/i);
      }
    }
  });

  it('the heuristic reveal is honest: names its sources and its limits', () => {
    const h = rankPersonas('as_written').heuristic;
    expect(h).toMatch(/provisional/i);
    expect(h).toMatch(/not measurement/i);
    expect(h).toMatch(/battery/i);
  });

  it('missing-referent forks rank gap-flagging receivers above improvisers', () => {
    const r = rankPersonas('dangling_pronoun');
    const topVendors = r.top.map((x) => x.card.vendor);
    const grokPos = topVendors.indexOf('grok');
    const claudePos = topVendors.indexOf('claude');
    // Claude (literal 78, cautious 72) must outrank Grok (literal 45, cautious 25)
    // on a cautious+literal weighted reading — heuristic sanity, not a quality claim.
    expect(claudePos).toBeGreaterThanOrEqual(0);
    if (grokPos !== -1) expect(claudePos).toBeLessThan(grokPos);
  });

  it('honors a custom topN', () => {
    const r = rankPersonas('as_written', 5);
    expect(r.top).toHaveLength(5);
    expect(r.unranked).toHaveLength(1);
  });
});
