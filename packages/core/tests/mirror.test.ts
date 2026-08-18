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

  // ── D1 structural rewrite (2026-08-17): reference edge, subject position ──
  // Founder bug: mid-sentence subject anaphors were invisible because the old
  // detector only looked at the first word of the prompt.
  describe('D1 rewrite — reference edge anywhere in subject position', () => {
    it('REGRESSION (founder bug): "when did that happen" forks on "that"', () => {
      const r = mirror('when did that happen');
      expect(r.clean).toBe(false);
      const fork = r.ambiguousSpans.find((s) => s.kind === 'dangling_pronoun');
      expect(fork).toBeDefined();
      expect(fork!.text.toLowerCase()).toBe('that');
      expect('when did that happen'.slice(fork!.start, fork!.end)).toBe(fork!.text);
    });

    it('inverted question frames fork: "When did it break?" / "why is this failing"', () => {
      for (const p of ['When did it break?', 'why is this failing']) {
        const r = mirror(p);
        expect(r.ambiguousSpans.some((s) => s.kind === 'dangling_pronoun'), p).toBe(true);
      }
    });

    it('contraction subject forks: "that\'s broken again" flags "that"', () => {
      const r = mirror("that's broken again");
      const fork = r.ambiguousSpans.find((s) => s.kind === 'dangling_pronoun');
      expect(fork).toBeDefined();
      expect(fork!.text.toLowerCase()).toBe('that');
    });

    it('an antecedent in a prior sentence discharges the edge (silent)', () => {
      const r = mirror('The deploy failed. When did that happen?');
      expect(r.ambiguousSpans.filter((s) => s.kind === 'dangling_pronoun')).toHaveLength(0);
    });

    it('an antecedent earlier in the same sentence discharges the edge (silent)', () => {
      const r = mirror('The deploy failed and that is bad.');
      expect(r.ambiguousSpans.filter((s) => s.kind === 'dangling_pronoun')).toHaveLength(0);
    });

    it('relative-clause "that" is locally bound (silent): "The file that is broken…"', () => {
      const r = mirror('The file that is broken needs review.');
      expect(r.ambiguousSpans.filter((s) => s.kind === 'dangling_pronoun')).toHaveLength(0);
    });

    it('complementizer "that" is locally bound (silent): "The problem is that the tests keep failing."', () => {
      const r = mirror('The problem is that the tests keep failing.');
      expect(r.ambiguousSpans.filter((s) => s.kind === 'dangling_pronoun')).toHaveLength(0);
    });

    it('object-position pronouns stay in D6\'s lane: "I know that you left early." is silent here', () => {
      const r = mirror('I know that you left early.');
      expect(r.ambiguousSpans.filter((s) => s.kind === 'dangling_pronoun')).toHaveLength(0);
    });
  });

  it('external reference: "the above" flags as pointing outside the prompt', () => {
    const r = mirror('Please rewrite the above in a friendlier tone.');
    const fork = r.ambiguousSpans.find((s) => s.kind === 'external_reference');
    expect(fork).toBeDefined();
    expect(fork!.text.toLowerCase()).toBe('the above');
  });

  // ── CAL-3a regression fixtures (2026-08-16 census false positives) ──
  it('CAL-3a T-2: rhetorical "…or am I being…" does not fork', () => {
    const r = mirror('Would this annoy you or am I being sensitive?');
    expect(r.ambiguousSpans.filter((s) => s.kind === 'compare_or_choose')).toHaveLength(0);
  });

  it('CAL-3a T-14: retrospective "Was it X or Y?" does not fork', () => {
    const r = mirror('Was it disinterest or genuine forgetfulness?');
    expect(r.ambiguousSpans.filter((s) => s.kind === 'compare_or_choose')).toHaveLength(0);
  });

  it('CAL-3a T-45: invitation pair "any thoughts or perspectives" does not fork', () => {
    const r = mirror('So, any thoughts or perspectives on how this was weird or annoying?');
    expect(r.ambiguousSpans.filter((s) => s.kind === 'compare_or_choose')).toHaveLength(0);
  });

  it('CAL-3a T-6: "only" with cross-clause coordination does not fork', () => {
    const r = mirror('That only gets done maybe once a week, and I can only make myself do it at night.');
    expect(r.ambiguousSpans.filter((s) => s.kind === 'scope_fork')).toHaveLength(0);
  });

  it('CAL-3a T-36: post-positioned "only," does not fork', () => {
    const r = mirror('Communicate through your mom only, limit interaction, and tighten your privacy.');
    expect(r.ambiguousSpans.filter((s) => s.kind === 'scope_fork')).toHaveLength(0);
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

  // ── D6 unification (2026-08-17 census): object-position reference edges ──
  // The curated imperative-verb list is gone; claims are structural and share
  // D1's discharge machinery. Census specimens T05/T15 as regression tests.
  describe('D6 unification — object references without the verb list', () => {
    it('CENSUS T05: "turn this into a YouTube video…" forks on "this"', () => {
      const r = mirror('I want to turn this into a helpful YouTube video for turning an autistic experience into legal definitions  for ssa claims for free  are there any tools I should know about that could help me accomplish that');
      const fork = r.ambiguousSpans.find((s) => s.kind === 'bare_object');
      expect(fork).toBeDefined();
      expect(fork!.text.toLowerCase()).toContain('this');
    });

    it('CENSUS T15: "I had to send this" forks on "this"', () => {
      const r = mirror('I had to send this');
      const fork = r.ambiguousSpans.find((s) => s.kind === 'bare_object');
      expect(fork).toBeDefined();
    });

    it('a real in-sentence antecedent discharges: "Take the report and send it to Bob" is silent', () => {
      const r = mirror('Take the report and send it to Bob.');
      expect(r.ambiguousSpans.filter((s) => s.kind === 'bare_object')).toHaveLength(0);
    });

    it("parity: \"let's summarize it\" still forks (old verb-list case, new machinery)", () => {
      const r = mirror("let's summarize it");
      expect(r.ambiguousSpans.some((s) => s.kind === 'bare_object')).toBe(true);
    });

    it('restricted "that" frame: "Can you translate that for me?" forks', () => {
      const r = mirror('Can you translate that for me?');
      expect(r.ambiguousSpans.some((s) => s.kind === 'bare_object')).toBe(true);
    });

    it('complementizer stays silent: "I know that you left early."', () => {
      const r = mirror('I know that you left early.');
      expect(r.ambiguousSpans.filter((s) => s.kind === 'bare_object')).toHaveLength(0);
    });

    it('determiner stays silent: "Please send this file to the team."', () => {
      const r = mirror('Please send this file to the team.');
      expect(r.ambiguousSpans.filter((s) => s.kind === 'bare_object')).toHaveLength(0);
    });

    it('new behavior, documented: "Please deposit this at the bank before it closes." now forks on "this"', () => {
      // Previously silent only because the old detector's verb list lacked
      // "deposit" — the object edge was always dangling. Not a frozen
      // zero-fork control; the D8 test on this sentence filters polysemy only.
      const r = mirror('Please deposit this at the bank before it closes.');
      expect(r.ambiguousSpans.some((s) => s.kind === 'bare_object')).toBe(true);
    });

    // ── D6 hardening (2026-08-18 FP census) ──
    it('aux-decline: "I think this is a good direction" — "this" is a clause subject, silent', () => {
      const r = mirror('I think this is a good direction.');
      expect(r.ambiguousSpans.filter((s) => s.kind === 'bare_object')).toHaveLength(0);
    });

    it('expletive resultative: "make it so that everyone can join" is silent', () => {
      const r = mirror('I want to make it so that everyone can join.');
      expect(r.ambiguousSpans.filter((s) => s.kind === 'bare_object')).toHaveLength(0);
    });

    it('idiom-adjacent still fine: bare "convert this to mt5" forks (single sentence)', () => {
      expect(mirror('Will you convert this to mt5 for me').ambiguousSpans.some((s) => s.kind === 'bare_object')).toBe(true);
    });

    it('forward paste discharge: "optimize this." + a code paste is silent', () => {
      const r = mirror('Optimize this.\n```\nint x = 1;\n```');
      expect(r.ambiguousSpans.filter((s) => s.kind === 'bare_object')).toHaveLength(0);
    });

    it('forward colon discharge: "check it out: <block>" is silent', () => {
      const r = mirror('Check it out: the report is attached below.');
      expect(r.ambiguousSpans.filter((s) => s.kind === 'bare_object')).toHaveLength(0);
    });

    it('T05/T15 preserved: same-sentence prose after the pronoun is NOT a paste', () => {
      expect(mirror('I want to turn this into a helpful YouTube video for ssa claims').ambiguousSpans.some((s) => s.kind === 'bare_object')).toBe(true);
      expect(mirror('I had to send this').ambiguousSpans.some((s) => s.kind === 'bare_object')).toBe(true);
    });
  });

  // ── D1 expletive-it guard (2026-08-18 FP census) ──
  describe('D1 — expletive "it" is not a dangling reference', () => {
    it('extraposition: "It kills me that I lose my memory" is silent', () => {
      const r = mirror('It kills me that I lose my memory.');
      expect(r.ambiguousSpans.filter((s) => s.kind === 'dangling_pronoun')).toHaveLength(0);
    });

    it('raising: "It seems broken" is silent', () => {
      const r = mirror('It seems broken.');
      expect(r.ambiguousSpans.filter((s) => s.kind === 'dangling_pronoun')).toHaveLength(0);
    });

    it('referential "it" still fires: "It keeps crashing when I click save."', () => {
      const r = mirror('It keeps crashing when I click save.');
      expect(r.ambiguousSpans.some((s) => s.kind === 'dangling_pronoun')).toBe(true);
    });

    it('demonstrative not extraposition: "It broke that module" still fires', () => {
      const r = mirror('It broke that module.');
      expect(r.ambiguousSpans.some((s) => s.kind === 'dangling_pronoun')).toBe(true);
    });
  });

  // ── Unfenced-code masking (2026-08-18 FP census G3) ──
  describe('non-prose mask — unfenced code lines', () => {
    it('a raw #property/code line does not fire detectors', () => {
      const r = mirror('#property copyright "xAI"\ndouble x = only(a) and(b);');
      expect(r.ambiguousSpans).toHaveLength(0);
    });

    it('tab-columned compiler output is masked', () => {
      const r = mirror("'if' - semicolon expected\tFPF_Topology_EA.mq5\t477\t4");
      expect(r.ambiguousSpans).toHaveLength(0);
    });
  });

  // ── Input hygiene (2026-08-17 census): fence/log guard ──
  describe('non-prose mask — code and logs neither fire nor starve detectors', () => {
    const T28 = "```javascript\nSecurity policy violated in strategy | Use of functions is not allowed: ['getattr'] \n\nIf you wrote this code, you understand what it does, and you believe it is safe, you can disable Bot Studio checks. \nBe extra careful if this is code that someone else sent to you or you found it online! \n\nMore info: \nhttps://tradelocker.com/how-to/how-to-disable-bot-code-checks/\n```\n\njust make it for btc and it is  a single file input";

    it('CENSUS T28 (wild false positive): fenced error dump + prose tail is clean', () => {
      const r = mirror(T28);
      expect(r.ambiguousSpans).toHaveLength(0);
      expect(r.clean).toBe(true);
    });

    it('the fence counts as a referent: "make it" after a code block is discharged', () => {
      const r = mirror('```\nconst x = 1;\n```\nnow fix it');
      expect(r.ambiguousSpans.filter((s) => s.kind === 'bare_object')).toHaveLength(0);
    });

    it('log-shaped lines are ignored: timestamped dump with scope bait is clean', () => {
      const r = mirror('2025.11.29 06:30:02.113\tCore 1\tonly buy and sell here\nERROR: only the first and second legs filled');
      expect(r.ambiguousSpans).toHaveLength(0);
    });

    it('prose before a fence still forks, with offsets valid in the ORIGINAL text', () => {
      const text = 'Should I use React or Vue for this?\n```\nconst x = only(1) and(2);\n```';
      const r = mirror(text);
      const fork = r.ambiguousSpans.find((s) => s.kind === 'compare_or_choose');
      expect(fork).toBeDefined();
      expect(text.slice(fork!.start, fork!.end)).toBe(fork!.text);
      expect(r.ambiguousSpans.filter((s) => s.kind === 'scope_fork')).toHaveLength(0);
    });

    it('an input that is entirely one fence is clean', () => {
      expect(mirror('```python\nprint("only a and b")\n```').clean).toBe(true);
    });
  });

  // ── D4 hardening (census T28 tail): clause coordination is not a list ──
  it('adverbial-just tail: "just make it for btc and it is a single file input" has no scope fork', () => {
    const r = mirror('just make it for btc and it is  a single file input');
    expect(r.ambiguousSpans.filter((s) => s.kind === 'scope_fork')).toHaveLength(0);
  });

  // ── D2 widening BENCHED (2026-08-18 FP census: 40–47% precision < 60% gate) ──
  // The #84 history-clause and session-artifact frames over-fired in the wild
  // (mention-vs-use on "your memory", relative-clause "which I built"). They
  // are benched until a use/mention distinction clears the census. These tests
  // pin the benched behavior so a future re-land is a deliberate change.
  describe('D2 — fixed phrases live; #84 widening benched', () => {
    const extRefs = (p: string) => mirror(p).ambiguousSpans.filter((s) => s.kind === 'external_reference');

    it('fixed phrase still fires with nothing before it: "rewrite the above…"', () => {
      expect(extRefs('Rewrite the above in a friendlier tone.').length).toBe(1);
    });

    it('backward discharge: "the above" after a paragraph of content is silent', () => {
      const long = 'Here is the full blueprint. '.repeat(12) + 'Now implement the above.';
      expect(extRefs(long)).toHaveLength(0);
    });

    it('BENCHED: "what I just put in your custom instructions" (T23) no longer fires', () => {
      expect(extRefs('Can you build what I just put in your custom instructions')).toHaveLength(0);
    });

    it('BENCHED: history clause "the thing you wrote earlier" no longer fires', () => {
      expect(extRefs('Summarize the thing you wrote earlier.')).toHaveLength(0);
    });

    it('mention-not-use no longer FPs: "how does your memory work" is silent', () => {
      expect(extRefs('I know how does your memory work then.')).toHaveLength(0);
    });

    it('present-tense intent stays silent: "what I want is a clean design"', () => {
      expect(extRefs('What I want is a clean design.')).toHaveLength(0);
    });
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
