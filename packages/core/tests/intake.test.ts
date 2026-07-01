import { describe, it, expect } from 'vitest';
import {
  INTAKE_ITEMS,
  scoreIntake,
  deriveRenderingDirectives,
  buildProfileCard,
  updateProfile,
  profileDivergence,
} from '../src/intake';

describe('INTAKE_ITEMS', () => {
  it('has exactly one item per receiver primitive', () => {
    const prims = INTAKE_ITEMS.map((i) => i.primitive).sort();
    expect(prims).toEqual(['AR', 'FT', 'SG', 'TI', 'UE']);
  });
  it('every option carries an anchor in [0,100]', () => {
    for (const item of INTAKE_ITEMS)
      for (const o of item.options) {
        expect(o.anchor).toBeGreaterThanOrEqual(0);
        expect(o.anchor).toBeLessThanOrEqual(100);
      }
  });
});

describe('scoreIntake', () => {
  it('maps chosen options to the right anchors', () => {
    const p = scoreIntake({ TI: 'a', SG: 'a', FT: 'a', UE: 'b', AR: 'a' });
    expect(p).toEqual({ TI: 20, SG: 25, FT: 80, UE: 50, AR: 75 });
  });
  it('falls back to neutral 50 for missing answers', () => {
    expect(scoreIntake({})).toEqual({ TI: 50, SG: 50, FT: 50, UE: 50, AR: 50 });
  });
});

describe('deriveRenderingDirectives', () => {
  it('high FT ⇒ explicit_literal (the literal-communicator case)', () => {
    expect(deriveRenderingDirectives(scoreIntake({ FT: 'a' })).explicitness).toBe('explicit_literal');
  });
  it('low FT ⇒ implication_ok', () => {
    expect(deriveRenderingDirectives(scoreIntake({ FT: 'c' })).explicitness).toBe('implication_ok');
  });
  it('low AR ⇒ clarify, high AR ⇒ commit', () => {
    expect(deriveRenderingDirectives(scoreIntake({ AR: 'c' })).ambiguity).toBe('clarify');
    expect(deriveRenderingDirectives(scoreIntake({ AR: 'a' })).ambiguity).toBe('commit');
  });
  it('two different people get different renderings', () => {
    const a = deriveRenderingDirectives(scoreIntake({ TI: 'a', SG: 'a', FT: 'a', UE: 'b', AR: 'a' }));
    const b = deriveRenderingDirectives(scoreIntake({ TI: 'c', SG: 'b', FT: 'b', UE: 'c', AR: 'c' }));
    expect(a).not.toEqual(b);
  });
});

describe('updateProfile', () => {
  it('moves toward the observed value and stays bounded', () => {
    const prior = scoreIntake({ FT: 'a', UE: 'a' }); // FT 80, UE 75 (fast)
    const after = updateProfile(prior, { FT: 30 });
    expect(after.FT).toBeLessThan(prior.FT);
    expect(after.FT).toBeGreaterThan(30);
    expect(after.FT).toBeGreaterThanOrEqual(0);
    expect(after.FT).toBeLessThanOrEqual(100);
  });
  it('leaves untouched primitives unchanged', () => {
    const prior = scoreIntake({ TI: 'b', FT: 'a' });
    expect(updateProfile(prior, { FT: 10 }).TI).toBe(prior.TI);
  });
});

describe('buildProfileCard', () => {
  it('produces an editable summary referencing all five primitives', () => {
    const card = buildProfileCard(scoreIntake({ TI: 'a', SG: 'a', FT: 'a', UE: 'b', AR: 'a' }));
    for (const k of ['TI', 'SG', 'FT', 'UE', 'AR']) expect(card.summary).toContain(k);
  });
});

describe('profileDivergence (self vs observed mirror)', () => {
  it('is empty when self matches observed', () => {
    const p = scoreIntake({ TI: 'b', SG: 'b', FT: 'b', UE: 'b', AR: 'b' });
    const div = profileDivergence(p, p);
    expect(div.magnitude).toBe(0);
    expect(div.notes).toHaveLength(0);
  });
  it('reports notes only on axes whose gap clears the threshold', () => {
    const selfSet = scoreIntake({ SG: 'c', FT: 'c' }); // SG80 FT25, rest 50
    const observed = scoreIntake({ SG: 'a', FT: 'a' }); // SG25 FT80, rest 50
    const div = profileDivergence(selfSet, observed);
    expect(div.delta.FT).toBe(55);
    expect(div.delta.SG).toBe(-55);
    expect(div.magnitude).toBeGreaterThan(0);
    expect(div.notes.length).toBe(2); // only SG and FT cleared ±20
  });
  it('picks the directionally-correct phrasing', () => {
    const selfSet = scoreIntake({ FT: 'c' });  // sees self as subtext-reader (25)
    const observed = scoreIntake({ FT: 'a' });  // lands literal (80)
    const div = profileDivergence(selfSet, observed);
    expect(div.notes.join(' ')).toMatch(/literal|explicit/i);
  });
});
