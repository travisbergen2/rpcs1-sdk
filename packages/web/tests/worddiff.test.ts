import { describe, it, expect } from 'vitest';
import { diffBase } from '../lib/worddiff';

const removedText = (base: string, result: string) =>
  diffBase(base, result).filter((t) => t.removed).map((t) => t.text).join(' ');

describe('worddiff — dial preview highlighting (E-INT-1 miss-anatomy fix)', () => {
  it('identical texts mark nothing removed', () => {
    const t = 'Summarize the memo in two sentences.';
    expect(diffBase(t, t).every((x) => !x.removed)).toBe(true);
  });

  it('marks a deleted leading clause as removed', () => {
    const base = 'The board votes in an hour so please hurry. Summarize the memo.';
    const result = 'Summarize the memo.';
    const removed = removedText(base, result);
    expect(removed).toContain('hurry.');
    expect(removed).toContain('votes');
    // the surviving task is not marked
    const kept = diffBase(base, result).filter((t) => !t.removed).map((t) => t.text).join(' ');
    expect(kept).toBe('Summarize the memo.');
  });

  it('distinguishes urgency-strip from register-strip on a near-twin prompt', () => {
    const base = "My head is pounding. We're about to present, hurry! What is 15% of 240?";
    const urgencyStripped = 'My head is pounding. What is 15% of 240?';
    const registerStripped = "We're about to present, hurry! What is 15% of 240?";
    // the two dial positions strike DIFFERENT words — that is the disambiguation
    expect(removedText(base, urgencyStripped)).not.toBe(removedText(base, registerStripped));
    expect(removedText(base, urgencyStripped)).toContain('hurry!');
    expect(removedText(base, registerStripped)).toContain('pounding.');
  });

  it('marks relocated constraint words as removed-from-here', () => {
    const base = 'Summarize this and don\'t mention pricing: the plan costs $29.';
    const result = 'Constraints (mandatory):\n- Summarize this and don\'t mention pricing: the plan costs $29';
    // everything survives (relocated), so little should be marked
    const removedCount = diffBase(base, result).filter((t) => t.removed).length;
    expect(removedCount).toBeLessThanOrEqual(1); // trailing punctuation variant at most
  });

  it('empty base yields empty diff', () => {
    expect(diffBase('', 'anything')).toEqual([]);
  });
});
