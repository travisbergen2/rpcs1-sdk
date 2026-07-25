import { describe, it, expect } from 'vitest';
import { analyzeSprawl } from '../src/sprawl';

/**
 * FIXTURE CORPUS — real prompts, donated by the product's own author
 * (approved 2026-07-25: "You should absolutely use some of my prompts as
 * training material"). Product-related content only, lightly trimmed.
 * These are exactly the sprawling, run-on, perspective-flipping prompts
 * SendRight exists for — better fixtures than anything invented.
 */
const REAL_PROMPT_REASONING_BUBBLES =
  'I think rpcs1 would be best if it were able to summarize the reasoning bubbles that highlights the decision tree the ai is taking so the user can see how it is thinking about the prompt right away and be able to stop the model and realign it before it burns a bunch of tokens doing something irrelevant or even give the user a short explanation of what they just prompted by rewording it making the questionable aspects of their prompt noticeable before prompt is processed giving the user the opportunity to correct the rewording to be aligned with their intentions. I know sometimes I send a prompt start reading the reply and realize it is replying to something I almost said but I could have said it clearer but I didn’t realize there would be confusion because I dont know what I dont know also so there can be ambiguities I never realized existed until I see the model’s interpretation';

const REAL_PROMPT_NL2BUILD_PIVOT =
  'I am planning on running my other products through this also like nl2build so users get built what they wanted built with less rebuilds and I was using it for my small business site quality boost side project I am trying to start probably more things if I can get this to be adopted by some users. Instead of making the user paste and copy could we just let them type their prompt like they were talking to the model they normally use but our program would let them prompt give them suggestion interpretation with the model that would handle that interpretation best attached to the suggestion they could just click the prompt they want handled automatically sent to the optimal model for the task';

const REAL_PROMPT_TOP5_PANEL =
  'With the model we could have the prompt interpretation and then a model selection with top 5 suggestions and personality and accuracy stats next to each and after selected we would open the model app the user has already and auto fill the prompt field so they just hit send if they approve';

describe('analyzeSprawl — real-prompt fixtures (the product author corpus)', () => {
  it('reasoning-bubbles prompt: detected as sprawling', () => {
    const r = analyzeSprawl(REAL_PROMPT_REASONING_BUBBLES);
    expect(r.sprawling).toBe(true);
  });

  it('nl2build pivot prompt: the I→users perspective flip is caught', () => {
    const r = analyzeSprawl(REAL_PROMPT_NL2BUILD_PIVOT);
    expect(r.flips.length).toBeGreaterThanOrEqual(1);
    expect(r.sprawling).toBe(true);
  });

  it('top-5 panel prompt: analyzable without error, offsets valid', () => {
    const r = analyzeSprawl(REAL_PROMPT_TOP5_PANEL);
    for (const seg of r.segments) {
      expect(REAL_PROMPT_TOP5_PANEL.slice(seg.start, seg.end)).toBe(seg.text);
    }
    for (const f of r.flips) {
      expect(f.start).toBeGreaterThanOrEqual(0);
      expect(f.end).toBeLessThanOrEqual(REAL_PROMPT_TOP5_PANEL.length);
    }
  });

  it('documented limitation: run-on prompts with little punctuation resist topic segmentation', () => {
    // The nl2build fixture is two long run-on sentences — sentence-based
    // segmentation cannot subdivide it. This test PINS the limitation so a
    // future fix (clause-level splitting) shows up as an intentional change.
    const r = analyzeSprawl(REAL_PROMPT_NL2BUILD_PIVOT);
    expect(r.segments.length).toBeLessThanOrEqual(2);
  });
});

describe('analyzeSprawl — topic segmentation (punctuated multi-topic)', () => {
  const TWO_TOPICS =
    'Write a summary of my sales data from last quarter. Include the top five customers and their revenue totals. Also can you plan a birthday party for my daughter? She likes horses and the party is next month. What venues would work for a horse-themed party?';

  it('splits a two-topic prompt into 2+ segments', () => {
    const r = analyzeSprawl(TWO_TOPICS);
    expect(r.segments.length).toBeGreaterThanOrEqual(2);
  });

  it('counts 3+ asks and flags sprawling', () => {
    const r = analyzeSprawl(TWO_TOPICS);
    expect(r.totalAsks).toBeGreaterThanOrEqual(3);
    expect(r.sprawling).toBe(true);
  });

  it('segment offsets reconstruct the original text', () => {
    const r = analyzeSprawl(TWO_TOPICS);
    for (const seg of r.segments) {
      expect(TWO_TOPICS.slice(seg.start, seg.end)).toBe(seg.text);
    }
  });

  it('every segment carries a short display label', () => {
    const r = analyzeSprawl(TWO_TOPICS);
    for (const seg of r.segments) {
      expect(seg.label.length).toBeGreaterThan(0);
      expect(seg.label.split(/\s+/).length).toBeLessThanOrEqual(7);
    }
  });
});

describe('analyzeSprawl — contradiction / interference detection', () => {
  it('length axis: brief vs comprehensive clash', () => {
    const r = analyzeSprawl('Keep it brief. I want a comprehensive breakdown of every step in the process.');
    const c = r.conflicts.find((x) => x.kind === 'style_axis');
    expect(c).toBeDefined();
    expect(c!.aText.toLowerCase()).toBe('brief');
    expect(c!.bText.toLowerCase()).toBe('comprehensive');
    expect(c!.why).toMatch(/opposite directions/);
    expect(r.sprawling).toBe(true);
  });

  it('register axis: formal vs casual clash', () => {
    const r = analyzeSprawl('Make it formal enough for a client. Keep the tone casual and friendly.');
    expect(r.conflicts.some((x) => x.kind === 'style_axis')).toBe(true);
  });

  it('negation conflict: ruled-out thing later requested', () => {
    const r = analyzeSprawl("Don't use code in your answer. Please include a code sample at the end.");
    const c = r.conflicts.find((x) => x.kind === 'negation');
    expect(c).toBeDefined();
    expect(c!.why).toMatch(/rules out/);
  });

  it('conflict spans point at the actual clashing words', () => {
    const text = 'Keep it brief. I want a comprehensive breakdown.';
    const r = analyzeSprawl(text);
    const c = r.conflicts[0];
    expect(text.slice(c.aStart, c.aEnd)).toBe(c.aText);
    expect(text.slice(c.bStart, c.bEnd)).toBe(c.bText);
  });
});

describe('analyzeSprawl — zero-sprawl controls (the outline MUST stay silent)', () => {
  const compact = [
    'Write a haiku about winter mornings.',
    'Compare Python and JavaScript for backend development, covering performance and ecosystem.',
    'Explain how photosynthesis works for a ten-year-old.',
    'Translate "good morning" into Spanish.',
  ];

  for (const p of compact) {
    it(`compact: "${p.slice(0, 45)}..." is not sprawling`, () => {
      const r = analyzeSprawl(p);
      expect(r.sprawling).toBe(false);
      expect(r.conflicts).toHaveLength(0);
      expect(r.flips).toHaveLength(0);
      expect(r.segments.length).toBeLessThanOrEqual(1);
    });
  }

  it('empty input is not sprawling and never throws', () => {
    expect(analyzeSprawl('').sprawling).toBe(false);
    expect(analyzeSprawl('   ').sprawling).toBe(false);
  });
});

describe('analyzeSprawl — determinism', () => {
  it('identical input produces identical output', () => {
    expect(analyzeSprawl(REAL_PROMPT_REASONING_BUBBLES)).toEqual(analyzeSprawl(REAL_PROMPT_REASONING_BUBBLES));
  });
});
