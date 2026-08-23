import { describe, it, expect } from 'vitest';
import {
  slugify,
  wikilink,
  composeSessionNote,
  composeLearningsLine,
  composeContextPack,
  LEARNINGS_HEADER,
  type SessionMeta,
} from '../src/writeback.js';

const meta = (over: Partial<SessionMeta> = {}): SessionMeta => ({
  date: '2026-08-23 03:30',
  rounds: 3,
  lockedCount: 4,
  totalLines: 5,
  sources: [
    { source: 'Weekly review tool', path: 'projects/Weekly review tool.md', chars: 412 },
    { source: 'receiver-basics', path: 'notes/receiver-basics.md', chars: 288 },
  ],
  ...over,
});

describe('slugify', () => {
  it('lowercases, hyphenates, strips punctuation, caps length', () => {
    expect(slugify('I need a Weekly Review tool! ASAP.')).toBe('i-need-a-weekly-review-tool-asap');
    expect(slugify('x'.repeat(100)).length).toBeLessThanOrEqual(40);
  });
  it('never returns empty', () => {
    expect(slugify('!!!')).toBe('session');
  });
});

describe('wikilink', () => {
  it('drops the .md extension', () => {
    expect(wikilink('projects/Weekly review tool.md')).toBe('[[projects/Weekly review tool]]');
  });
});

describe('composeSessionNote', () => {
  it('carries the metric fields in frontmatter', () => {
    const { basename, content } = composeSessionNote('Build me a weekly review.', null, meta());
    expect(basename).toBe('2026-08-23 build-me-a-weekly-review');
    expect(content).toContain('kind: loop-session');
    expect(content).toContain('rounds: 3');
    expect(content).toContain('locked: 4/5');
    expect(content).toContain('  - projects/Weekly review tool.md');
  });
  it('wikilinks every source — the graph edges', () => {
    const { content } = composeSessionNote('p', null, meta());
    expect(content).toContain('- [[projects/Weekly review tool]] (412 chars used)');
    expect(content).toContain('- [[notes/receiver-basics]] (288 chars used)');
  });
  it('includes the answer section only when there is one', () => {
    expect(composeSessionNote('p', 'the answer', meta()).content).toContain('## The answer');
    expect(composeSessionNote('p', null, meta()).content).not.toContain('## The answer');
  });
  it('omits the sources section when nothing left the machine', () => {
    const { content } = composeSessionNote('p', null, meta({ sources: [] }));
    expect(content).not.toContain('## Sources');
    expect(content).not.toContain('sources:');
  });
});

describe('composeLearningsLine', () => {
  it('is one greppable line with the metric', () => {
    expect(composeLearningsLine(meta())).toBe(
      '- 2026-08-23 03:30 · rounds 3 · locked 4/5 · sources 2',
    );
  });
});

describe('composeContextPack', () => {
  it('takes only the trailing session lines, capped', () => {
    const lines = LEARNINGS_HEADER.split('\n').concat(
      Array.from({ length: 15 }, (_, i) => `- day ${i} · rounds 2 · locked 3/4 · sources 1`),
    );
    const pack = composeContextPack(lines);
    expect(pack).toContain('- day 14');
    expect(pack).toContain('- day 5');
    expect(pack).not.toContain('- day 4');
    expect(pack.startsWith('CONTEXT ABOUT ME')).toBe(true);
    expect(pack).toContain('END CONTEXT.');
  });
  it('handles an empty history honestly', () => {
    expect(composeContextPack([])).toContain('(no loop history yet)');
  });
});
