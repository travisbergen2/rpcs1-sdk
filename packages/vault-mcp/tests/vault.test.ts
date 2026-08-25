import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import {
  hasDotSegment,
  safeResolve,
  walkMarkdown,
  parseAliases,
  parseHeadings,
  listNotes,
  readNote,
  buildCandidates,
  VaultPathError,
} from '../src/vault.js';

const VAULT = fileURLToPath(new URL('./fixture-vault', import.meta.url));
const ALLOW = ['notes', 'projects'];

describe('path safety', () => {
  it('flags dot segments anywhere in the path', () => {
    expect(hasDotSegment('.obsidian/plugins/x/data.json')).toBe(true);
    expect(hasDotSegment('notes/.hidden.md')).toBe(true);
    expect(hasDotSegment('a/../b.md')).toBe(true);
    expect(hasDotSegment('notes/Receiver basics.md')).toBe(false);
  });
  it('safeResolve rejects absolute paths', async () => {
    await expect(safeResolve(VAULT, '/etc/passwd')).rejects.toThrow(VaultPathError);
  });
  it('safeResolve rejects traversal', async () => {
    await expect(safeResolve(VAULT, '../outside.md')).rejects.toThrow(VaultPathError);
    await expect(safeResolve(VAULT, 'notes/../../outside.md')).rejects.toThrow(VaultPathError);
  });
  it('safeResolve rejects .obsidian even though it exists', async () => {
    await expect(
      safeResolve(VAULT, '.obsidian/plugins/explicit-formula-loop/data.json'),
    ).rejects.toThrow(VaultPathError);
  });
  it('safeResolve accepts a real note', async () => {
    const abs = await safeResolve(VAULT, 'notes/Receiver basics.md');
    expect(abs.endsWith('Receiver basics.md')).toBe(true);
  });
});

describe('walkMarkdown', () => {
  it('finds .md files and never enters dot-directories', async () => {
    const all = await walkMarkdown(VAULT);
    const paths = all.map((n) => n.path).sort();
    expect(paths).toEqual([
      'Root scratch.md',
      'notes/Gold scanning.md',
      'notes/Receiver basics.md',
      'private/Secret plans.md',
      'projects/Weekly review tool.md',
    ]);
    expect(paths.some((p) => p.includes('.obsidian'))).toBe(false);
  });
});

describe('frontmatter and heading parsing', () => {
  it('parses inline-array aliases', () => {
    expect(parseAliases('---\naliases: [tuning, receiver dynamics]\n---\nbody')).toEqual([
      'tuning',
      'receiver dynamics',
    ]);
  });
  it('parses block-list aliases with quotes', () => {
    const content = '---\naliases:\n  - "review ritual"\n  - weekly cadence\n---\nbody';
    expect(parseAliases(content)).toEqual(['review ritual', 'weekly cadence']);
  });
  it('parses inline scalar aliases', () => {
    expect(parseAliases('---\naliases: solo name\n---\n')).toEqual(['solo name']);
  });
  it('returns [] without frontmatter', () => {
    expect(parseAliases('# Just a note\naliases: [not, frontmatter]')).toEqual([]);
  });
  it('parses headings at all levels', () => {
    expect(parseHeadings('# One\ntext\n### Three\n#not-a-heading')).toEqual(['One', 'Three']);
  });
});

describe('listNotes', () => {
  it('lists only allowlisted notes', async () => {
    const { notes, total } = await listNotes(VAULT, ALLOW);
    const paths = notes.map((n) => n.path);
    expect(total).toBe(3);
    expect(paths).toContain('notes/Receiver basics.md');
    expect(paths).toContain('projects/Weekly review tool.md');
    expect(paths.some((p) => p.startsWith('private/'))).toBe(false);
    expect(paths).not.toContain('Root scratch.md');
  });
  it('applies the folder filter', async () => {
    const { notes } = await listNotes(VAULT, ALLOW, 'projects');
    expect(notes.map((n) => n.path)).toEqual(['projects/Weekly review tool.md']);
  });
  it('empty allowlist lists nothing', async () => {
    const { notes, total } = await listNotes(VAULT, []);
    expect(notes).toEqual([]);
    expect(total).toBe(0);
  });
});

describe('readNote', () => {
  it('reads an allowlisted note', async () => {
    const res = await readNote(VAULT, ALLOW, 'notes/Receiver basics.md');
    expect(res.text).toContain('Temperature and oscillation');
    expect(res.truncated).toBe(false);
    expect(res.totalChars).toBe(res.text.length);
  });
  it('refuses non-allowlisted notes (the private folder)', async () => {
    await expect(readNote(VAULT, ALLOW, 'private/Secret plans.md')).rejects.toThrow(VaultPathError);
  });
  it('refuses everything when the allowlist is empty', async () => {
    await expect(readNote(VAULT, [], 'notes/Receiver basics.md')).rejects.toThrow(VaultPathError);
  });
  it('honors offset + cap and reports continuation', async () => {
    const full = await readNote(VAULT, ALLOW, 'notes/Receiver basics.md');
    const part = await readNote(VAULT, ALLOW, 'notes/Receiver basics.md', 10, 20);
    expect(part.text).toBe(full.text.slice(10, 30));
    expect(part.truncated).toBe(true);
    expect(part.offset).toBe(10);
  });
});

describe('buildCandidates', () => {
  it('builds candidates only from allowlisted notes, hop always 3', async () => {
    const cands = await buildCandidates(VAULT, ALLOW);
    expect(cands.length).toBe(3);
    for (const c of cands) expect(c.hop).toBe(3);
    const receiver = cands.find((c) => c.path === 'notes/Receiver basics.md')!;
    expect(receiver.aliases).toEqual(['tuning', 'receiver dynamics']);
    expect(receiver.headings).toEqual(['Receiver basics']);
    expect(cands.some((c) => c.content.includes('SECRET-TOKEN'))).toBe(false);
  });
});
