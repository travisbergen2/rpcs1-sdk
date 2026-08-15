import { describe, it, expect } from 'vitest';
import { buildForkView } from '../src/fork';
import type { TranslationOutput } from '../src/translator';

const mkInterpret = (over: Partial<TranslationOutput> = {}): TranslationOutput => ({
  original: 'test',
  recovered_entities: [],
  recovered_intent: { type: 'general', confidence: 0.6 },
  canonical_translation: 'test',
  translation_integrity: 90,
  confidence: 0.7,
  ar_level: 'AR1',
  playback_required: false,
  clarifying_questions: [],
  candidates: [],
  margin: 0.5,
  engine: 'gateway:test',
  ...over,
});

describe('buildForkView — deterministic floor (mirror)', () => {
  it('clean text with no interpret is status clean, mirror-only, zero branches', () => {
    const r = buildForkView('Please summarize the attached quarterly report in two paragraphs.');
    expect(r.status).toBe('clean');
    expect(r.branches).toHaveLength(0);
    expect(r.engine).toBe('mirror-only');
    expect(r.branch_question).toBeNull();
    expect(r.forked_answer_scaffold).toBeNull();
  });

  it('compare-or-choose text forks with two mirror branches, question, scaffold, consequence', () => {
    // Known-firing input from mirror.test.ts
    const r = buildForkView('What do you think about React or Vue for my project?');
    expect(r.status).toBe('forks');
    expect(r.branches.length).toBeGreaterThanOrEqual(2);
    expect(r.branches[0].source).toBe('mirror');
    expect(r.branches[0].consequence).toBeTruthy();
    expect(r.branch_question).toMatch(/^Quick check — do you mean "/);
    expect(r.forked_answer_scaffold).toMatch(/^If you mean "/);
    expect(r.spans.length).toBeGreaterThan(0);
    expect(r.spans[0].start).toBeGreaterThanOrEqual(0);
  });

  it('empty text is clean', () => {
    const r = buildForkView('');
    expect(r.status).toBe('clean');
    expect(r.branches).toHaveLength(0);
  });
});

describe('buildForkView — model contribution (engine-gated)', () => {
  it('model paraphrases become branches on mirror-clean text', () => {
    const r = buildForkView(
      'Handle the vendor situation before Monday.',
      mkInterpret({
        reading_paraphrases: ['Resolve the dispute with the vendor', 'Prepare the vendor presentation'],
      }),
    );
    expect(r.status).toBe('forks');
    expect(r.branches.map((b) => b.source)).toEqual(['model', 'model']);
    expect(r.branches[0].canonical).toBe('Resolve the dispute with the vendor');
    expect(r.engine).toBe('mirror+gateway:test');
  });

  it('rules-path interpret output is ignored entirely (calibration gate)', () => {
    const r = buildForkView(
      'Please summarize the attached quarterly report in two paragraphs.',
      mkInterpret({
        engine: 'rules',
        reading_paraphrases: ['A', 'B'],
        recovered_entities: [
          {
            original: 'the',
            category: 'unspecified',
            candidate: { text: '[unspecified referent]', confidence: 0.5 },
            alternatives: [],
          },
        ],
        clarifying_questions: ['What does "the" refer to?'],
      }),
    );
    expect(r.status).toBe('clean');
    expect(r.branches).toHaveLength(0);
    expect(r.ask_backs).toHaveLength(0);
    expect(r.engine).toBe('mirror-only');
    expect(r.ar_level).toBeNull();
  });

  it('mirror bare-object + model paraphrase compose to forks (live sentence)', () => {
    // interpret alone graded this AR0; mirror's bare_object detector still
    // catches "fix that" — the composition is strictly stronger than either.
    const r = buildForkView(
      'Can you fix that thing before they see it',
      mkInterpret({ reading_paraphrases: ['Repair the item before it is noticed'], ar_level: 'AR0' }),
    );
    expect(r.status).toBe('forks');
    expect(r.branches.some((b) => b.source === 'mirror')).toBe(true);
    expect(r.branches.some((b) => b.source === 'model')).toBe(true);
  });

  it('unresolved model entity with fewer than two branches is status referent, ask-back from engine question', () => {
    // Sentence verified mirror-quiet (no detector fires).
    const r = buildForkView(
      'Send the invoice to the client tomorrow morning.',
      mkInterpret({
        reading_paraphrases: ['Send the invoice to the client'],
        recovered_entities: [
          {
            original: 'the client',
            category: 'unspecified',
            candidate: { text: '[the client being discussed]', confidence: 0.6 },
            alternatives: [],
          },
        ],
        clarifying_questions: ['What does "the client" refer to?'],
        ar_level: 'AR0',
      }),
    );
    expect(r.status).toBe('referent');
    expect(r.branch_question).toBe('What does "the client" refer to?');
    expect(r.ar_level).toBe('AR0');
  });

  it('deduplicates model paraphrases against mirror summaries case-insensitively', () => {
    const forked = 'What do you think about React or Vue for my project?';
    const base = buildForkView(forked);
    const dupOfMirror = base.branches[0].summary.toUpperCase();
    const r = buildForkView(forked, mkInterpret({ reading_paraphrases: [dupOfMirror, 'A genuinely new reading'] }));
    const summaries = r.branches.map((b) => b.summary.toLowerCase());
    expect(new Set(summaries).size).toBe(summaries.length);
    expect(summaries).toContain('a genuinely new reading');
  });

  it('caps branches at maxBranches', () => {
    const r = buildForkView(
      'Handle the vendor situation before Monday.',
      mkInterpret({ reading_paraphrases: ['R1', 'R2', 'R3', 'R4', 'R5'] }),
      { maxBranches: 3 },
    );
    expect(r.branches).toHaveLength(3);
  });

  it('truncates long readings in the question with an ellipsis', () => {
    const long = 'x'.repeat(200);
    const r = buildForkView(
      'Handle the vendor situation before Monday.',
      mkInterpret({ reading_paraphrases: [long, 'short reading'] }),
    );
    expect(r.branch_question).toContain('…');
    expect(r.branch_question!.length).toBeLessThan(250);
  });
});
