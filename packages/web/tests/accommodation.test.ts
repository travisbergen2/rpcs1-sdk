import { describe, expect, it } from 'vitest';
import { composeAccommodationRecord, NOTES_MAX_CHARS } from '../lib/accommodation';

const meta = { surface: 'explicitformula.com web app', date: '2026-08-30' };

describe('composeAccommodationRecord (web)', () => {
  it('renders configured settings in plain language', () => {
    const md = composeAccommodationRecord(
      { textScale: 'large', responseDelayMs: 2000, notes: '' },
      meta,
    );
    expect(md).toMatch(/Panel text size: Large/);
    expect(md).toMatch(/no sooner than 2 seconds/);
    expect(md).toMatch(/Surface: explicitformula\.com web app/);
    expect(md).not.toMatch(/Version:/); // version line omitted when not provided
  });

  it('includes the user notes verbatim, or an explicit none marker', () => {
    const withNotes = composeAccommodationRecord(
      { textScale: 'default', responseDelayMs: 0, notes: 'I process written information best.' },
      meta,
    );
    expect(withNotes).toMatch(/I process written information best\./);
    const without = composeAccommodationRecord(
      { textScale: 'default', responseDelayMs: 0, notes: '   ' },
      meta,
    );
    expect(without).toMatch(/\(none provided\)/);
  });

  it('caps runaway notes', () => {
    const md = composeAccommodationRecord(
      { textScale: 'default', responseDelayMs: 0, notes: 'x'.repeat(NOTES_MAX_CHARS + 500) },
      meta,
    );
    expect(md.length).toBeLessThan(NOTES_MAX_CHARS + 1500);
  });

  it('makes no certification claims and normalizes junk settings', () => {
    const md = composeAccommodationRecord(
      // junk arrives from old localStorage — must render as defaults, not crash
      { textScale: 'huge' as never, responseDelayMs: NaN, notes: '' },
      meta,
    );
    expect(md).toMatch(/Panel text size: Default/);
    expect(md).toMatch(/Response pacing: Instant/);
    expect(md.toLowerCase()).not.toMatch(/certif|compliant with|guarantee/);
    expect(md).toMatch(/supporting documentation/);
  });
});
