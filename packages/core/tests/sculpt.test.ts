import { describe, it, expect } from 'vitest';
import { buildSculpt } from '../src/sculpt';

describe('buildSculpt — whole-prompt guidance (v0 deterministic)', () => {
  it('the screenshot sentence yields pointer holes and a relative-time substitution', () => {
    const r = buildSculpt('What card was they wanting for that thing the other night?');
    expect(r.engine).toBe('sculpt-rules');
    expect(r.contract).toBe('accept-skip-per-change');
    const kinds = r.changes.map((c) => c.kind);
    expect(kinds).toContain('substitution'); // "the other night"
    const timeSub = r.changes.find((c) => c.id === 'sub:other-day');
    expect(timeSub!.y).toBe('on [which night?]');
    expect(timeSub!.reason).toMatch(/cannot date-resolve/);
    // preview applies replaces and keeps holes visible
    expect(r.sculpted_preview).toContain('on [which night?]');
    expect(r.length_ratio).toBeGreaterThan(0);
  });

  it('clean self-contained text produces zero changes (silence at prompt scale)', () => {
    const r = buildSculpt('Please summarize the attached quarterly report in two paragraphs.');
    expect(r.changes).toHaveLength(0);
    expect(r.sculpted_preview).toBe('Please summarize the attached quarterly report in two paragraphs.');
    expect(r.length_ratio).toBe(1);
  });

  it('asap becomes a deadline hole with a blameless reason', () => {
    const r = buildSculpt('Send me the numbers asap please.');
    const sub = r.changes.find((c) => c.id === 'sub:asap');
    expect(sub).toBeDefined();
    expect(sub!.y).toBe('by [when?]');
    expect(sub!.reason).toMatch(/deadline a reader can act on/);
    expect(r.sculpted_preview).toContain('by [when?]');
  });

  it('two asks trigger one append-only enumeration listing both', () => {
    const r = buildSculpt('Can you send the file? Also what time works tomorrow?');
    const asks = r.changes.find((c) => c.kind === 'asks');
    expect(asks).toBeDefined();
    expect(asks!.apply).toBe('append');
    expect(asks!.y).toContain('1) Can you send the file?');
    expect(asks!.y).toContain('2)');
    expect(r.ask_count).toBe(2);
    expect(r.sculpted_preview.endsWith(asks!.y)).toBe(true);
  });

  it('single ask gets no enumeration', () => {
    const r = buildSculpt('Can you send the vendor file today?');
    expect(r.changes.find((c) => c.kind === 'asks')).toBeUndefined();
  });

  it('overlapping candidates keep the first and drop the collision', () => {
    // "handle it" (lexicon) overlaps mirror bare_object territory on "it";
    // whichever claims the range first wins, the other is skipped.
    const r = buildSculpt('Please handle it before the meeting.');
    const spans = r.changes.filter((c) => c.span).map((c) => [c.span!.start, c.span!.end]);
    for (let i = 0; i < spans.length; i++) {
      for (let j = i + 1; j < spans.length; j++) {
        const [a1, b1] = spans[i]; const [a2, b2] = spans[j];
        expect(a1 < b2 && a2 < b1).toBe(false);
      }
    }
  });

  it('indirect request becomes direct with the literal-receiver reason', () => {
    const r = buildSculpt('I was wondering if you could review the draft.');
    const sub = r.changes.find((c) => c.id === 'sub:wondering');
    expect(sub).toBeDefined();
    expect(sub!.y).toBe('please');
    expect(r.sculpted_preview).toMatch(/^please review the draft/i);
  });

  it('preview replaces right-to-left so offsets never corrupt', () => {
    const r = buildSculpt('Touch base sometime about the launch?');
    expect(r.sculpted_preview).toContain('talk for [how long?] about [what?]');
    expect(r.sculpted_preview).toContain('by [when?]');
    expect(r.sculpted_preview).not.toContain('touch base');
  });

  it('length ratio is reported (the length guard)', () => {
    const r = buildSculpt('Do the needful asap.');
    expect(r.length_ratio).toBeGreaterThan(1); // holes are longer than idioms
    expect(typeof r.length_ratio).toBe('number');
  });
});
