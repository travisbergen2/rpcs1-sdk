import { describe, it, expect } from 'vitest';
import {
  tokenize,
  lexicalScore,
  graphScore,
  recencyScore,
  excerptAround,
  isAllowed,
  selectSnippets,
  MIN_SCORE,
  SELECT_CAPS,
  type CandidateNote,
} from '../src/selector.js';

const NOW = 1_760_000_000_000;
const DAY = 86_400_000;

function note(partial: Partial<CandidateNote> & { path: string }): CandidateNote {
  return {
    title: partial.path.split('/').pop()!.replace(/\.md$/, ''),
    aliases: [],
    headings: [],
    content: '',
    hop: 3,
    mtime: NOW - 90 * DAY, // stale by default so recency ≈ 0
    ...partial,
  };
}

describe('tokenize', () => {
  it('drops stopwords and short tokens, dedupes', () => {
    const t = tokenize('I want the weekly review thing for the weekly review');
    expect(t).toContain('weekly');
    expect(t).toContain('review');
    expect(t).not.toContain('the');
    expect(t).not.toContain('want');
    expect(t.filter((x) => x === 'weekly')).toHaveLength(1);
  });
});

describe('isAllowed (privacy law 3)', () => {
  it('empty allowlist means vault reads OFF', () => {
    expect(isAllowed('notes/a.md', [])).toBe(false);
  });
  it('matches folder prefixes exactly, not substrings', () => {
    expect(isAllowed('notes/a.md', ['notes'])).toBe(true);
    expect(isAllowed('notes2/a.md', ['notes'])).toBe(false);
    expect(isAllowed('projects/x/y.md', ['projects'])).toBe(true);
    expect(isAllowed('other/a.md', ['notes', 'projects'])).toBe(false);
  });
});

describe('scoring components', () => {
  it('graph score orders hop 0 > 1 > 2 > unlinked', () => {
    expect(graphScore(0)).toBeGreaterThan(graphScore(1));
    expect(graphScore(1)).toBeGreaterThan(graphScore(2));
    expect(graphScore(2)).toBeGreaterThan(graphScore(3));
  });
  it('recency halves every 7 days', () => {
    const fresh = recencyScore(NOW, NOW);
    const week = recencyScore(NOW - 7 * DAY, NOW);
    expect(fresh).toBeCloseTo(1, 5);
    expect(week).toBeCloseTo(0.5, 5);
  });
  it('title hits outweigh body hits', () => {
    const tokens = tokenize('weekly review dropped threads');
    const titled = note({ path: 'a/Weekly review tool.md', content: 'nothing relevant' });
    const bodied = note({ path: 'b/misc.md', content: 'weekly review dropped threads all here' });
    expect(lexicalScore(tokens, titled)).toBeGreaterThan(lexicalScore(tokens, bodied));
  });
});

describe('MIN_SCORE gate (nothing ships on proximity alone)', () => {
  const dump = 'weekly review of dropped threads, must work offline';
  it('a bare 1-hop link with no lexical match is NOT selected', () => {
    const r = selectSnippets(dump, [note({ path: 'linked/unrelated.md', hop: 1, content: 'zebra migration patterns' })], NOW);
    expect(r.snippets).toHaveLength(0);
  });
  it('a bare recent edit with no other signal is NOT selected', () => {
    const r = selectSnippets(dump, [note({ path: 'recent/unrelated.md', mtime: NOW, content: 'zebra migration patterns' })], NOW);
    expect(r.snippets).toHaveLength(0);
  });
  it('the active note qualifies alone (hop 0 = 3 ≥ MIN_SCORE)', () => {
    expect(graphScore(0)).toBeGreaterThanOrEqual(MIN_SCORE);
    const r = selectSnippets(dump, [note({ path: 'active.md', hop: 0, content: 'zebra' })], NOW);
    expect(r.snippets).toHaveLength(1);
  });
  it('title match + 1-hop qualifies', () => {
    const r = selectSnippets(dump, [note({ path: 'p/Weekly review tool.md', hop: 1, content: 'offline constraint noted' })], NOW);
    expect(r.snippets).toHaveLength(1);
  });
});

describe('selectSnippets caps + determinism + disclosure log', () => {
  const dump = 'weekly review dropped threads offline porch';
  const many = Array.from({ length: 10 }, (_, i) =>
    note({
      path: `n/Weekly review ${i}.md`,
      hop: 1,
      content: ('weekly review notes about dropped threads and the porch offline constraint ' + 'filler '.repeat(200)),
    }),
  );
  it('enforces snippet count and total char caps', () => {
    const r = selectSnippets(dump, many, NOW);
    expect(r.snippets.length).toBeLessThanOrEqual(SELECT_CAPS.maxSnippets);
    const total = r.snippets.reduce((n, s) => n + s.text.length, 0);
    expect(total).toBeLessThanOrEqual(SELECT_CAPS.maxTotalChars);
    for (const s of r.snippets) expect(s.text.length).toBeLessThanOrEqual(SELECT_CAPS.maxPerNoteChars);
  });
  it('is deterministic with a stable tie-break', () => {
    const a = selectSnippets(dump, many, NOW);
    const b = selectSnippets(dump, [...many].reverse(), NOW);
    expect(a.snippets.map((s) => s.source)).toEqual(b.snippets.map((s) => s.source));
  });
  it('every shipped snippet has a matching log entry (the disclosure IS the shipment)', () => {
    const r = selectSnippets(dump, many, NOW);
    expect(r.log).toHaveLength(r.snippets.length);
    r.snippets.forEach((s, i) => {
      expect(r.log[i].source).toBe(s.source);
      expect(r.log[i].chars).toBe(s.text.length);
      expect(r.log[i].path).toBeTruthy();
      expect(r.log[i].score).toBeGreaterThanOrEqual(MIN_SCORE);
    });
  });
});

describe('excerptAround', () => {
  it('returns short content whole', () => {
    expect(excerptAround('short note', ['short'], 600)).toBe('short note');
  });
  it('windows around the first matching token in long content', () => {
    const long = 'x '.repeat(500) + 'the porch offline constraint sits here ' + 'y '.repeat(500);
    const cut = excerptAround(long, ['porch'], 200);
    expect(cut.length).toBeLessThanOrEqual(200);
    expect(cut).toContain('porch');
  });
  it('falls back to the head when only the title matched', () => {
    const long = 'beginning of the note here ' + 'z '.repeat(600);
    const cut = excerptAround(long, ['nomatchtoken'], 100);
    expect(cut.startsWith('beginning of the note')).toBe(true);
    expect(cut.length).toBeLessThanOrEqual(100);
  });
});
