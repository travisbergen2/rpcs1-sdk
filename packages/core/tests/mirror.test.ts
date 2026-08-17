import { describe, it, expect } from 'vitest';
import { mirror, applyReading } from '../src/mirror';

describe('mirror — fork detection', () => {
  it('compare-or-choose: "X or Y" question without an explicit verb forks', () => {
    const r = mirror('What do you think about React or Vue for my project?');
    expect(r.clean).toBe(false);
    const fork = r.ambiguousSpans.find((s) => s.kind === 'compare_or_choose');
    expect(fork).toBeDefined();
    expect(fork!.readings).toHaveLength(2);
    expect(fork!.readings.map((x) => x.summary).join(' ')).toMatch(/compare/i);
    expect(fork!.readings.map((x) => x.summary).join(' ')).toMatch(/pick/i);
  });

  it('compare-or-choose: comparand boundaries are trimmed to content words', () => {
    const r = mirror('What do you think about React or Vue for my project?');
    const fork = r.ambiguousSpans.find((s) => s.kind === 'compare_or_choose');
    expect(fork).toBeDefined();
    expect(fork!.text).toBe('React or Vue');
    expect(fork!.readings[0].summary).toBe('Compare React and Vue');
    expect(fork!.readings[1].summary).toBe('Pick one of React / Vue for me');
    // Offsets must still address the original text exactly.
    const orig = 'What do you think about React or Vue for my project?';
    expect(orig.slice(fork!.start, fork!.end)).toBe('React or Vue');
  });

  it('compare-or-choose: multi-word comparands keep their content words', () => {
    const r = mirror('Should I use React Native or Flutter for the app?');
    const fork = r.ambiguousSpans.find((s) => s.kind === 'compare_or_choose');
    expect(fork).toBeDefined();
    expect(fork!.text).toBe('React Native or Flutter');
    expect(fork!.readings[0].summary).toBe('Compare React Native and Flutter');
  });

  it('compare-or-choose: a side made only of stopwords is not a comparand', () => {
    const r = mirror('Should we go with this or the other option tomorrow?');
    // "with this or the other" would previously fork on junk; the left side
    // trims to nothing, so no compare_or_choose span may fire.
    expect(r.ambiguousSpans.filter((s) => s.kind === 'compare_or_choose')).toHaveLength(0);
  });

  it('compare-or-choose: explicit "compare" suppresses the fork', () => {
    const r = mirror('Compare React or Vue for my project?');
    expect(r.ambiguousSpans.filter((s) => s.kind === 'compare_or_choose')).toHaveLength(0);
  });

  it('dangling pronoun: prompt-initial "it" with no antecedent forks', () => {
    const r = mirror('It keeps crashing when I click save.');
    expect(r.clean).toBe(false);
    expect(r.ambiguousSpans[0].kind).toBe('dangling_pronoun');
    expect(r.ambiguousSpans[0].start).toBe(0);
    expect(r.ambiguousSpans[0].text.toLowerCase()).toBe('it');
  });

  it('external reference: "the above" flags as pointing outside the prompt', () => {
    const r = mirror('Please rewrite the above in a friendlier tone.');
    const fork = r.ambiguousSpans.find((s) => s.kind === 'external_reference');
    expect(fork).toBeDefined();
    expect(fork!.text.toLowerCase()).toBe('the above');
  });

  it('scope fork: "only" before a coordination forks', () => {
    const r = mirror('Update only the readme and the changelog entries.');
    const fork = r.ambiguousSpans.find((s) => s.kind === 'scope_fork');
    expect(fork).toBeDefined();
    expect(fork!.readings).toHaveLength(2);
  });

  it('grouping fork: mixed "and/or" without parentheses forks', () => {
    const r = mirror('Deploy staging and production or rollback.');
    const fork = r.ambiguousSpans.find((s) => s.kind === 'grouping_fork');
    expect(fork).toBeDefined();
    expect(fork!.readings[0].summary).toContain('(');
  });

  it('bare object: "fix it" in a short prompt forks', () => {
    const r = mirror('Can you fix it?');
    const fork = r.ambiguousSpans.find((s) => s.kind === 'bare_object');
    expect(fork).toBeDefined();
  });

  it('bare object: long preamble suppresses the fork (referent likely present)', () => {
    const long = 'Here is my function: function add(a, b) { return a - b } — the sign is wrong and the tests below show the expected outputs. Please fix it.';
    const r = mirror(long);
    expect(r.ambiguousSpans.filter((s) => s.kind === 'bare_object')).toHaveLength(0);
  });

  it('spans carry valid offsets into the original text', () => {
    const text = 'Please rewrite the above in a friendlier tone.';
    const r = mirror(text);
    for (const s of r.ambiguousSpans) {
      expect(text.slice(s.start, s.end)).toBe(s.text);
    }
  });

  it('prompt-level readings come from the highest-priority span', () => {
    // Contains both a compare_or_choose fork and an external_reference;
    // compare_or_choose outranks it for the chip strip.
    const r = mirror('Should I use React or Vue like before?');
    expect(r.readings[0].id.startsWith('compare_or_choose')).toBe(true);
    expect(r.readings.length).toBeGreaterThanOrEqual(2);
  });
});

describe('mirror — zero-fork controls (the strip MUST stay silent)', () => {
  const cleanPrompts = [
    'Write a haiku about winter mornings.',
    'Summarize the following article: The quick brown fox jumps over the lazy dog. It was a sunny day and the fox was pleased.',
    'Compare Python and JavaScript for backend development, covering performance and ecosystem.',
    'List five vegetarian dinner recipes that take under 30 minutes.',
    'Translate "good morning" into Spanish, French, and German.',
    'Explain how photosynthesis works for a ten-year-old.',
  ];

  for (const p of cleanPrompts) {
    it(`clean: "${p.slice(0, 50)}..." produces no spans`, () => {
      const r = mirror(p);
      expect(r.ambiguousSpans).toHaveLength(0);
      expect(r.clean).toBe(true);
      expect(r.readings).toEqual([{ id: 'as_written', summary: 'As written', clarifier: null }]);
    });
  }

  it('empty and whitespace-only input is clean, never throws', () => {
    expect(mirror('').clean).toBe(true);
    expect(mirror('   \n  ').clean).toBe(true);
  });
});

describe('mirror — determinism', () => {
  it('identical input produces identical output', () => {
    const p = 'Should I use React or Vue like before? Fix it.';
    expect(mirror(p)).toEqual(mirror(p));
  });
});

describe('applyReading', () => {
  it('appends the clarifier on its own paragraph', () => {
    const out = applyReading('What about React or Vue?', 'To be clear: I want a comparison.');
    expect(out).toBe('What about React or Vue?\n\nTo be clear: I want a comparison.');
  });

  it('null-ish clarifier leaves the text unchanged apart from trailing trim', () => {
    expect(applyReading('Hello.  ', '')).toBe('Hello.');
  });
});

// ── D7/D8: lexical fork detectors (the deterministic branch-growers) ──
import { mirror as mirrorFn } from '../src/mirror';

describe('D7 — confusable typo fork', () => {
  it('catches the founding live-trace case: "pay cast" forks to cash', () => {
    const r = mirrorFn('I gotta fly to the bank, so I can pay cast.');
    const fork = r.ambiguousSpans.find((s) => s.kind === 'confusable_typo');
    expect(fork).toBeDefined();
    expect(fork!.text.toLowerCase()).toBe('cast');
    expect(fork!.readings.map((x) => x.summary).join(' ')).toContain('cash');
    expect(r.clean).toBe(false);
  });
  it('stays silent when the word as written is supported ("the film cast was paid well")', () => {
    const r = mirrorFn('The film cast was paid well.');
    expect(r.ambiguousSpans.filter((s) => s.kind === 'confusable_typo')).toHaveLength(0);
  });
  it('stays silent with no alternative support ("cast the fishing line")', () => {
    const r = mirrorFn('Cast the fishing line near the reeds.');
    expect(r.ambiguousSpans.filter((s) => s.kind === 'confusable_typo')).toHaveLength(0);
  });
  it('catches "bare with me"', () => {
    const r = mirrorFn('Bare with me while I get the numbers.');
    const fork = r.ambiguousSpans.find((s) => s.kind === 'confusable_typo');
    expect(fork).toBeDefined();
    expect(fork!.readings.map((x) => x.summary).join(' ')).toContain('bear');
  });
});

describe('D8 — polysemy fork', () => {
  it('fires only on TWO-SIDED support: bank with both fishing and deposit cues', () => {
    const r = mirrorFn('Meet me at the bank with the fishing rods and the deposit slip.');
    const fork = r.ambiguousSpans.find((s) => s.kind === 'polysemy_fork');
    expect(fork).toBeDefined();
    expect(fork!.readings.length).toBeGreaterThanOrEqual(2);
  });
  it('stays silent on one-sided support: "buy a reel to go fishing on the river bank"', () => {
    const r = mirrorFn('I need to buy a reel to go fishing on the river bank.');
    expect(r.ambiguousSpans.filter((s) => s.kind === 'polysemy_fork')).toHaveLength(0);
  });
  it('stays silent on one-sided financial use: "deposit this at the bank"', () => {
    const r = mirrorFn('Please deposit this at the bank before it closes.');
    expect(r.ambiguousSpans.filter((s) => s.kind === 'polysemy_fork')).toHaveLength(0);
  });
  it('book: reading-vs-reserve fires only with both cues present', () => {
    const both = mirrorFn('Book the hotel and grab the novel to read on the flight.');
    expect(both.ambiguousSpans.some((s) => s.kind === 'polysemy_fork')).toBe(true);
    const oneSided = mirrorFn('Book the hotel and the flight for Tuesday.');
    expect(oneSided.ambiguousSpans.filter((s) => s.kind === 'polysemy_fork')).toHaveLength(0);
  });
});
