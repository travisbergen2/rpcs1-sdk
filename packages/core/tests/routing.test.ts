import { describe, it, expect } from 'vitest';
import {
  shannonEntropy,
  computePosterior,
  updatePosterior,
  scoreLexicalLikelihoods,
  thresholdsFromProfile,
  routeByEntropy,
  routeIntent,
  DEFAULT_INTENT_HYPOTHESES,
  type IntentHypothesis,
} from '../src/routing';

const H: IntentHypothesis[] = [
  { id: 'a', label: 'reading A', cues: ['alpha'] },
  { id: 'b', label: 'reading B', cues: ['beta'] },
  { id: 'c', label: 'reading C', cues: ['gamma'] },
];

describe('shannonEntropy', () => {
  it('is 0 for a point mass and ln(k) for uniform', () => {
    expect(shannonEntropy([1, 0, 0])).toBe(0);
    expect(shannonEntropy([1 / 3, 1 / 3, 1 / 3])).toBeCloseTo(Math.log(3), 12);
  });

  it('is INVARIANT under label permutation (the guard-rail test)', () => {
    // A "random label" baseline is mathematically vacuous: permuting which
    // hypothesis carries which probability cannot change the entropy. This
    // test pins that fact so nobody ever builds that baseline into the SDK.
    const ps = [0.5, 0.3, 0.15, 0.05];
    const perms = [
      [0.3, 0.5, 0.05, 0.15],
      [0.05, 0.15, 0.3, 0.5],
      [0.15, 0.05, 0.5, 0.3],
    ];
    for (const q of perms) expect(shannonEntropy(q)).toBeCloseTo(shannonEntropy(ps), 12);
  });
});

describe('computePosterior', () => {
  it('normalizes, sorts descending, and reports normalized entropy in [0,1]', () => {
    const p = computePosterior(H, { a: 4, b: 1, c: 0 });
    expect(p.entries[0].id).toBe('a');
    expect(p.entries.reduce((s, e) => s + e.p, 0)).toBeCloseTo(1, 12);
    expect(p.normalizedEntropy).toBeGreaterThan(0);
    expect(p.normalizedEntropy).toBeLessThanOrEqual(1);
  });

  it('falls back to uniform when no evidence discriminates', () => {
    const p = computePosterior(H, { a: 0, b: 0, c: 0 });
    for (const e of p.entries) expect(e.p).toBeCloseTo(1 / 3, 6);
    expect(p.normalizedEntropy).toBeCloseTo(1, 3);
  });

  it('smoothing keeps zero-likelihood hypotheses alive but demoted', () => {
    const p = computePosterior(H, { a: 10, b: 0, c: 0 });
    const c = p.entries.find((e) => e.id === 'c')!;
    expect(c.p).toBeGreaterThan(0);
    expect(c.p).toBeLessThan(0.1);
  });

  it('respects priors', () => {
    const withPrior = computePosterior(
      H.map((h) => (h.id === 'b' ? { ...h, prior: 10 } : h)),
      { a: 1, b: 1, c: 1 },
    );
    expect(withPrior.entries[0].id).toBe('b');
  });

  it('throws on an empty hypothesis set', () => {
    expect(() => computePosterior([], {})).toThrow();
  });

  it('single hypothesis: entropy 0, margin 1', () => {
    const p = computePosterior([H[0]], { a: 3 });
    expect(p.normalizedEntropy).toBe(0);
    expect(p.margin).toBe(1);
  });
});

describe('updatePosterior (multi-turn)', () => {
  it('accumulates evidence across turns toward the consistent hypothesis', () => {
    let p = computePosterior(H, { a: 2, b: 1, c: 1 });
    const t1 = p.entries[0].p;
    p = updatePosterior(p, H, { a: 2, b: 1, c: 1 }, { forgetting: 1 });
    expect(p.entries[0].id).toBe('a');
    expect(p.entries[0].p).toBeGreaterThan(t1);
  });

  it('forgetting = 0 discards history (fresh start each turn)', () => {
    const prev = computePosterior(H, { a: 100, b: 0, c: 0 });
    const fresh = computePosterior(H, { a: 0, b: 100, c: 0 });
    const upd = updatePosterior(prev, H, { a: 0, b: 100, c: 0 }, { forgetting: 0 });
    expect(upd.entries[0].id).toBe('b');
    expect(upd.entries[0].p).toBeCloseTo(fresh.entries[0].p, 6);
  });

  it('forgetting = 1 retains history: prior evidence still dominates a weak reversal', () => {
    const prev = computePosterior(H, { a: 100, b: 0, c: 0 });
    const upd = updatePosterior(prev, H, { a: 0, b: 1, c: 0 }, { forgetting: 1 });
    expect(upd.entries[0].id).toBe('a');
  });
});

describe('scoreLexicalLikelihoods', () => {
  it('counts whole-word cue hits deterministically', () => {
    const l = scoreLexicalLikelihoods('alpha and beta but mostly alpha things', H);
    expect(l.a).toBe(1); // presence, not frequency
    expect(l.b).toBe(1);
    expect(l.c).toBe(0);
  });
  it('does not match cue substrings inside larger words', () => {
    const l = scoreLexicalLikelihoods('alphabet soup', H);
    expect(l.a).toBe(0);
  });
  it('matches multi-word cues by substring', () => {
    const l = scoreLexicalLikelihoods('this does not work at all — it crashes', [
      { id: 'x', label: 'broken', cues: ['not work', 'crash'] },
    ]);
    expect(l.x).toBe(1); // 'not work' hits; 'crash' vs 'crashes' is whole-word single token → no hit
  });
});

describe('thresholdsFromProfile', () => {
  it('neutral profile → anchor thresholds', () => {
    const t = thresholdsFromProfile({ TI: 50, SG: 50, FT: 50, UE: 50, AR: 50 });
    expect(t.tCommit).toBeCloseTo(0.45, 6);
    expect(t.tClarify).toBeCloseTo(0.75, 6);
  });
  it('high AR widens the commit region; low AR widens the clarify region', () => {
    const hi = thresholdsFromProfile({ TI: 50, SG: 50, FT: 50, UE: 50, AR: 100 });
    const lo = thresholdsFromProfile({ TI: 50, SG: 50, FT: 50, UE: 50, AR: 0 });
    expect(hi.tCommit).toBeGreaterThan(lo.tCommit);
    expect(hi.tClarify).toBeGreaterThan(lo.tClarify);
  });
  it('literal receivers (high FT) demand a larger commit margin', () => {
    const literal = thresholdsFromProfile({ TI: 50, SG: 50, FT: 90, UE: 50, AR: 50 });
    const neutral = thresholdsFromProfile({ TI: 50, SG: 50, FT: 50, UE: 50, AR: 50 });
    expect(literal.minCommitMargin).toBeGreaterThan(neutral.minCommitMargin);
  });
  it('undefined profile falls back to neutral', () => {
    expect(thresholdsFromProfile()).toEqual(thresholdsFromProfile({ TI: 50, SG: 50, FT: 50, UE: 50, AR: 50 }));
  });
});

describe('routeByEntropy', () => {
  it('commits silently when one reading dominates', () => {
    const d = routeByEntropy(computePosterior(H, { a: 50, b: 0, c: 0 }));
    expect(d.mode).toBe('commit');
    expect(d.top.id).toBe('a');
    expect(d.clarifyingQuestion).toBeNull();
    expect(d.options).toBeNull();
  });

  it('clarifies at maximal ambiguity, with a question separating the top two', () => {
    const d = routeByEntropy(computePosterior(H, { a: 1, b: 1, c: 1 }));
    expect(d.mode).toBe('clarify');
    expect(d.clarifyingQuestion).toContain('reading');
    expect(d.options!.length).toBeGreaterThanOrEqual(2);
  });

  it('presents options in the middle band', () => {
    const d = routeByEntropy(computePosterior(H, { a: 5, b: 2, c: 0.2 })); // T̂ ≈ 0.66: between commit (0.45) and clarify (0.75)
    expect(d.mode).toBe('present_options');
    expect(d.options).not.toBeNull();
  });

  it('commit_with_note when entropy is low but the top two are close', () => {
    // Two near-tied readings, third negligible: low normalized entropy over
    // k=3 support is not reachable, so use k=5 with mass on two entries.
    const H5: IntentHypothesis[] = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, label: id }));
    const d = routeByEntropy(computePosterior(H5, { a: 10, b: 9, c: 0, d: 0, e: 0 }, ), { tCommit: 0.6, minCommitMargin: 0.2 });
    expect(d.mode).toBe('commit_with_note');
  });

  it('rejects inverted thresholds', () => {
    const p = computePosterior(H, { a: 1, b: 1, c: 1 });
    expect(() => routeByEntropy(p, { tCommit: 0.9, tClarify: 0.5 })).toThrow();
  });

  it('every decision carries a deterministic why-trace', () => {
    const d = routeByEntropy(computePosterior(H, { a: 9, b: 1, c: 0 }));
    expect(d.why.length).toBeGreaterThan(10);
    expect(d.why).toContain('T̂');
  });
});

describe('routeIntent (end-to-end) & default hypothesis set', () => {
  it('unambiguous troubleshooting text → commit on troubleshoot', () => {
    const d = routeIntent('My build is broken, I keep getting an error and it is not working', DEFAULT_INTENT_HYPOTHESES);
    expect(d.top.id).toBe('troubleshoot');
    expect(d.mode === 'commit' || d.mode === 'commit_with_note').toBe(true);
  });

  it('the ChatGPT-example ambiguous prompt does NOT silently commit', () => {
    const d = routeIntent('I need something to make my business more efficient.', DEFAULT_INTENT_HYPOTHESES);
    expect(d.mode === 'clarify' || d.mode === 'present_options').toBe(true);
  });

  it('low-AR receiver clarifies where a high-AR receiver commits', () => {
    const text = 'help me automate my reports and maybe compare pricing';
    const lo = routeIntent(text, DEFAULT_INTENT_HYPOTHESES, { profile: { TI: 50, SG: 50, FT: 50, UE: 50, AR: 5 } });
    const hi = routeIntent(text, DEFAULT_INTENT_HYPOTHESES, { profile: { TI: 50, SG: 50, FT: 50, UE: 50, AR: 95 } });
    const rank = (m: string) => ['commit', 'commit_with_note', 'present_options', 'clarify'].indexOf(m);
    expect(rank(lo.mode)).toBeGreaterThanOrEqual(rank(hi.mode));
  });

  it('multi-turn: a clarifying answer collapses the posterior', () => {
    const first = routeIntent('I need something to make my business more efficient.', DEFAULT_INTENT_HYPOTHESES);
    const second = routeIntent('mostly I want to automate the invoicing workflow', DEFAULT_INTENT_HYPOTHESES, {
      previous: first.posterior,
    });
    expect(second.top.id).toBe('save_time');
    expect(second.posterior.normalizedEntropy).toBeLessThan(first.posterior.normalizedEntropy);
  });

  it('default set includes the out-of-set catch-all', () => {
    expect(DEFAULT_INTENT_HYPOTHESES.some((h) => h.id === 'other')).toBe(true);
  });
});
