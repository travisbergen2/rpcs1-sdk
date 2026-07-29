import { describe, it, expect } from 'vitest';
import { rewriteForProfile, interpret } from '../src/translator';
import { scoreIntake } from '../src/intake';

describe('rewriteForProfile (receiver vector replaces fixed style)', () => {
  it('two different profiles produce different rewrite instructions', () => {
    const a = rewriteForProfile('x', scoreIntake({ FT: 'a', SG: 'a' })).rewrite_instructions;
    const b = rewriteForProfile('x', scoreIntake({ FT: 'c', SG: 'c' })).rewrite_instructions;
    expect(a).not.toEqual(b);
  });
  it('high-FT profile yields explicit/literal instruction', () => {
    const instr = rewriteForProfile('x', scoreIntake({ FT: 'a' })).rewrite_instructions;
    expect(instr).toMatch(/explicit|literal/i);
  });
  it('low-FT profile permits implication/subtext', () => {
    const instr = rewriteForProfile('x', scoreIntake({ FT: 'c' })).rewrite_instructions;
    expect(instr).toMatch(/implication|subtext/i);
  });
  it('style is profile-driven, not a fixed style name', () => {
    expect(rewriteForProfile('x', scoreIntake({})).style).toBe('profile');
  });
});

describe('interpret with receiver profile (clarify vs commit bends per user)', () => {
  const msg = 'can you look at this when you get a chance';
  it('low-AR user clarifies at least as readily as high-AR user', () => {
    const hiAR = interpret(msg, 'advice', scoreIntake({ AR: 'a', FT: 'c' }));
    const loAR = interpret(msg, 'advice', scoreIntake({ AR: 'c', FT: 'a' }));
    expect(Number(loAR.playback_required)).toBeGreaterThanOrEqual(Number(hiAR.playback_required));
  });
  it('high-FT profile does NOT fire the literalness question on clean literal text (static-question regression)', () => {
    // Live-trace finding 2026-07-29: keyword-intent confidence is constantly
    // low on out-of-vocabulary text, so gating on it made this question fire
    // on EVERY message for high-FT receivers. Clean text must stay silent.
    const out = interpret('I need to buy a reel to go fishing on the river bank', 'advice', scoreIntake({ FT: 'a', AR: 'b' }));
    expect(out.clarifying_questions).toHaveLength(0);
  });

  it('high-FT literal profile adds an explicit-check on lower-confidence input', () => {
    const out = interpret('do the thing', 'advice', scoreIntake({ FT: 'a', AR: 'b' }));
    expect(out.clarifying_questions.join(' ')).toMatch(/literal|explicit|refer to/i);
  });
  it('omitting the profile preserves the original behavior (back-compat)', () => {
    const without = interpret(msg, 'advice');
    expect(without).toHaveProperty('ar_level');
  });
});
