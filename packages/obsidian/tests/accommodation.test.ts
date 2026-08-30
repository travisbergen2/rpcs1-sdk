import { describe, expect, it } from 'vitest';
import { composeAccommodationRecord, NOTES_MAX_CHARS } from '../src/accommodation.js';

const base = {
  textScale: 'large',
  responseDelayMs: 1000,
  sessionNotesEnabled: true,
  learningsEnabled: false,
  accommodationNotes: '',
};
const meta = { version: '0.6.0', date: '2026-08-30' };

describe('composeAccommodationRecord (plugin)', () => {
  it('renders settings in plain language with the plugin version', () => {
    const md = composeAccommodationRecord(base, meta);
    expect(md).toMatch(/Panel text size: Large/);
    expect(md).toMatch(/no sooner than 1 second after asking/);
    expect(md).toMatch(/write-backs to the vault: on · Learnings tracking: off/);
    expect(md).toMatch(/Version: 0\.6\.0/);
  });

  it('never leaks vault structure — settings named, folders never', () => {
    const md = composeAccommodationRecord(
      { ...base, accommodationNotes: 'plain words from the user' },
      meta,
    );
    // The record must not carry endpoint or folder-name fields at all.
    expect(md).not.toMatch(/allowedFolders|writeBackFolder|endpoint|https?:\/\//);
    expect(md).toMatch(/no vault\ncontent, folder names, or conversation content/);
  });

  it('notes verbatim / none marker / cap', () => {
    expect(composeAccommodationRecord({ ...base, accommodationNotes: 'my words' }, meta)).toMatch(
      /my words/,
    );
    expect(composeAccommodationRecord(base, meta)).toMatch(/\(none provided\)/);
    const long = composeAccommodationRecord(
      { ...base, accommodationNotes: 'y'.repeat(NOTES_MAX_CHARS + 999) },
      meta,
    );
    expect(long.length).toBeLessThan(NOTES_MAX_CHARS + 1600);
  });

  it('junk settings normalize instead of crashing; no certification language', () => {
    const md = composeAccommodationRecord(
      { ...base, textScale: 42, responseDelayMs: -5 },
      meta,
    );
    expect(md).toMatch(/Panel text size: Default/);
    expect(md).toMatch(/Response pacing: Instant/);
    expect(md.toLowerCase()).not.toMatch(/certif|compliant with|guarantee/);
  });
});
