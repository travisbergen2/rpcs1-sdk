import { describe, it, expect } from 'vitest';
import {
  normalizeSpanText,
  segmentSentences,
  spansFromTexts,
  buildLoopMessages,
  parseLoopResponse,
  verifyRatchet,
  repairRatchet,
  finalizeRound,
  assemblePrompt,
  capContextSnippets,
  CONTEXT_SNIPPET_LIMITS,
  LOOP_SYSTEM_PROMPT,
  type LoopSpan,
} from '../src/loop.js';

const spans = (texts: string[]): LoopSpan[] =>
  texts.map((text, i) => ({ id: `s${i + 1}`, text, status: 'revised' as const }));

describe('normalizeSpanText', () => {
  it('collapses whitespace runs and trims', () => {
    expect(normalizeSpanText('  a\n b\t c  ')).toBe('a b c');
  });
  it('applies Unicode NFC', () => {
    // e + combining acute (NFD) must equal precomposed é (NFC)
    expect(normalizeSpanText('café')).toBe('café');
  });
});

describe('segmentSentences', () => {
  it('splits on sentence boundaries', () => {
    expect(segmentSentences('First one. Second one! Third one?')).toEqual([
      'First one.',
      'Second one!',
      'Third one?',
    ]);
  });
  it('protects common abbreviations', () => {
    const out = segmentSentences('Use e.g. This pattern. Then stop.');
    // "e.g." must not end a sentence even before a capital
    expect(out[0]).toContain('e.g. This pattern.');
    expect(out).toHaveLength(2);
  });
  it('splits paragraphs on blank lines', () => {
    expect(segmentSentences('para one line\n\npara two line')).toEqual([
      'para one line',
      'para two line',
    ]);
  });
  it('is deterministic and never returns empty spans', () => {
    const text = 'A. B. C.';
    const a = segmentSentences(text);
    const b = segmentSentences(text);
    expect(a).toEqual(b);
    expect(a.every((s) => s.trim().length > 0)).toBe(true);
  });
});

describe('parseLoopResponse', () => {
  it('parses a bare JSON array', () => {
    const raw = '[{"text":"Alpha.","kept":false},{"text":"Beta.","kept":true}]';
    const parsed = parseLoopResponse(raw);
    expect(parsed?.items).toEqual([
      { text: 'Alpha.', kept: false },
      { text: 'Beta.', kept: true },
    ]);
  });
  it('parses a fenced array with surrounding prose', () => {
    const raw = 'Here you go:\n```json\n[{"text":"Only one.","kept":false}]\n```\nDone.';
    expect(parseLoopResponse(raw)?.items).toEqual([{ text: 'Only one.', kept: false }]);
  });
  it('drops empty-text items but keeps the rest', () => {
    const raw = '[{"text":"  ","kept":false},{"text":"Real.","kept":false}]';
    expect(parseLoopResponse(raw)?.items).toEqual([{ text: 'Real.', kept: false }]);
  });
  it('returns null on junk, non-arrays, and malformed items', () => {
    expect(parseLoopResponse('no json here')).toBeNull();
    expect(parseLoopResponse('{"text":"obj not array","kept":true}')).toBeNull();
    expect(parseLoopResponse('[{"kept":true}]')).toBeNull();
    expect(parseLoopResponse('[]')).toBeNull();
  });
});

describe('buildLoopMessages', () => {
  it('round 1: includes the dump, no confirmed block', () => {
    const m = buildLoopMessages('raw dump text');
    expect(m.system).toBe(LOOP_SYSTEM_PROMPT);
    expect(m.user).toContain('<dump>\nraw dump text\n</dump>');
    expect(m.user).not.toContain('CONFIRMED');
  });
  it('round n: elected spans appear verbatim in the confirmed block', () => {
    const prev = spans(['Keep me exactly.', 'Redo me.']);
    const m = buildLoopMessages('dump', { spans: prev, electedIds: ['s1'] });
    expect(m.user).toContain('CONFIRMED lines');
    expect(m.user).toContain('Keep me exactly.');
    expect(m.user).toContain('Redo me.');
  });
  it('appends an extra directive to the system prompt when given', () => {
    const m = buildLoopMessages('d', undefined, 'EXTRA');
    expect(m.system.endsWith('EXTRA')).toBe(true);
  });
});

describe('verifyRatchet', () => {
  it('passes when every elected span survives (normalized match)', () => {
    const elected = spans(['Keep  me.']);
    const check = verifyRatchet(elected, [
      { text: 'Keep me.', kept: true },
      { text: 'New material.', kept: false },
    ]);
    expect(check.ok).toBe(true);
    expect(check.violations).toEqual([]);
  });
  it('flags a mutated elected span', () => {
    const elected = spans(['Keep me.']);
    const check = verifyRatchet(elected, [{ text: 'Keep me mostly.', kept: true }]);
    expect(check.ok).toBe(false);
    expect(check.violations).toEqual(['s1']);
  });
  it('flags a dropped elected span', () => {
    const elected = spans(['Keep me.', 'Me too.']);
    const check = verifyRatchet(elected, [{ text: 'Keep me.', kept: true }]);
    expect(check.ok).toBe(false);
    expect(check.violations).toEqual(['s2']);
  });
  it('requires one candidate per elected duplicate', () => {
    const elected = [
      { id: 's1', text: 'Same line.', status: 'revised' as const },
      { id: 's2', text: 'Same line.', status: 'revised' as const },
    ];
    const once = verifyRatchet(elected, [{ text: 'Same line.', kept: true }]);
    expect(once.ok).toBe(false);
    const twice = verifyRatchet(elected, [
      { text: 'Same line.', kept: true },
      { text: 'Same line.', kept: true },
    ]);
    expect(twice.ok).toBe(true);
  });
});

describe('repairRatchet', () => {
  it('is a no-op (marking aside) when everything survived', () => {
    const prev = spans(['A.', 'B.']);
    const out = repairRatchet(prev, ['s1'], [
      { text: 'A.', kept: false },
      { text: 'B redone.', kept: false },
    ]);
    expect(out).toEqual([
      { text: 'A.', kept: true },
      { text: 'B redone.', kept: false },
    ]);
  });
  it('re-inserts a dropped elected span deterministically', () => {
    const prev = spans(['A.', 'B.', 'C.']);
    const out = repairRatchet(prev, ['s1', 's3'], [
      { text: 'A.', kept: true },
      { text: 'B rewritten.', kept: false },
    ]);
    expect(out.map((o) => o.text)).toEqual(['A.', 'C.', 'B rewritten.']);
    expect(out[1]).toEqual({ text: 'C.', kept: true });
  });
  it('preserves relative order of multiple missing elected spans', () => {
    const prev = spans(['A.', 'B.', 'C.']);
    const out = repairRatchet(prev, ['s1', 's2', 's3'], [{ text: 'Unrelated.', kept: false }]);
    expect(out.map((o) => o.text)).toEqual(['A.', 'B.', 'C.', 'Unrelated.']);
    expect(out.slice(0, 3).every((o) => o.kept)).toBe(true);
  });
});

describe('finalizeRound', () => {
  it('round 1: all spans revised, never repaired', () => {
    const res = finalizeRound('[{"text":"One.","kept":true},{"text":"Two.","kept":false}]');
    expect(res).not.toBeNull();
    expect(res!.repaired).toBe(false);
    expect(res!.spans.map((s) => s.status)).toEqual(['revised', 'revised']);
    expect(res!.spans.map((s) => s.id)).toEqual(['s1', 's2']);
  });
  it('round n, compliant model: elected spans come back kept, no repair', () => {
    const prev = spans(['Locked line.', 'Loose line.']);
    const res = finalizeRound(
      '[{"text":"Locked line.","kept":true},{"text":"Loose line, sharpened.","kept":false}]',
      { spans: prev, electedIds: ['s1'] },
    );
    expect(res!.repaired).toBe(false);
    expect(res!.spans[0]).toMatchObject({ text: 'Locked line.', status: 'kept' });
    expect(res!.spans[1].status).toBe('revised');
  });
  it('round n, misbehaving model: ratchet repairs and reports violations', () => {
    const prev = spans(['Locked line.', 'Loose line.']);
    const res = finalizeRound(
      '[{"text":"Locked line, but I touched it.","kept":true}]',
      { spans: prev, electedIds: ['s1'] },
    );
    expect(res!.repaired).toBe(true);
    expect(res!.violations).toEqual(['s1']);
    const texts = res!.spans.map((s) => s.text);
    expect(texts).toContain('Locked line.');
    const locked = res!.spans.find((s) => s.text === 'Locked line.');
    expect(locked!.status).toBe('kept');
  });
  it('returns null on unparseable model output', () => {
    expect(finalizeRound('total junk')).toBeNull();
  });
});

describe('assemblePrompt', () => {
  it('joins spans in reading order with single spaces', () => {
    expect(assemblePrompt(spans(['One.', ' Two. ', 'Three.']))).toBe('One. Two. Three.');
  });
  it('skips empty spans', () => {
    expect(assemblePrompt(spans(['One.', '  ']))).toBe('One.');
  });
});

describe('context snippets (Phase B vault priors)', () => {
  it('caps snippet count and total characters deterministically', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      source: `note-${i}`,
      text: 'x'.repeat(500),
    }));
    const capped = capContextSnippets(many);
    expect(capped.length).toBeLessThanOrEqual(CONTEXT_SNIPPET_LIMITS.maxSnippets);
    const total = capped.reduce((n, s) => n + s.text.length, 0);
    expect(total).toBeLessThanOrEqual(CONTEXT_SNIPPET_LIMITS.maxTotalChars);
  });
  it('drops empty snippets and preserves order', () => {
    const capped = capContextSnippets([
      { source: 'a', text: '  ' },
      { source: 'b', text: 'keep me' },
      { source: 'c', text: 'me too' },
    ]);
    expect(capped.map((s) => s.source)).toEqual(['b', 'c']);
  });
  it('buildLoopMessages includes a fenced background block when snippets given', () => {
    const m = buildLoopMessages('the dump', undefined, undefined, [
      { source: 'Weekly review tool', text: 'Constraint: must work offline.' },
    ]);
    expect(m.user).toContain('<background>');
    expect(m.user).toContain('[Weekly review tool] Constraint: must work offline.');
    expect(m.user).toContain('</background>');
    expect(m.user.indexOf('<background>')).toBeLessThan(m.user.indexOf('<dump>'));
  });
  it('omits the background block when snippets are absent or empty', () => {
    expect(buildLoopMessages('d').user).not.toContain('<background>');
    expect(buildLoopMessages('d', undefined, undefined, []).user).not.toContain('<background>');
  });
});

describe('ratchet law end-to-end (monotone lock-in)', () => {
  it('elected content never regresses across simulated rounds', () => {
    // Round 1
    const r1 = finalizeRound('[{"text":"Goal: X.","kept":false},{"text":"Wrong guess.","kept":false}]')!;
    // User elects s1; model round 2 rewrites the rest but drops the lock.
    const r2 = finalizeRound('[{"text":"Better guess about the rest.","kept":false}]', {
      spans: r1.spans,
      electedIds: ['s1'],
    })!;
    expect(r2.repaired).toBe(true);
    expect(r2.spans.some((s) => s.text === 'Goal: X.' && s.status === 'kept')).toBe(true);
    // User elects both surviving lines; model round 3 behaves.
    const elected = r2.spans.map((s) => s.id);
    const r3 = finalizeRound(
      JSON.stringify(r2.spans.map((s) => ({ text: s.text, kept: true }))),
      { spans: r2.spans, electedIds: elected },
    )!;
    expect(r3.repaired).toBe(false);
    for (const s of r2.spans) {
      expect(r3.spans.some((t) => t.text === s.text && t.status === 'kept')).toBe(true);
    }
  });
});
