import { describe, it, expect } from 'vitest';
import { mkdtempSync, cpSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCliArgs } from '../src/config.js';
import { doSearch, doRead, doList, doSave, type ToolDeps } from '../src/tools.js';
import { composeMcpNote, uniqueBasename } from '../src/writeback.js';
import { AUDIT_BASENAME } from '../src/audit.js';

const FIXTURE = fileURLToPath(new URL('./fixture-vault', import.meta.url));

/** Fresh writable copy of the fixture vault (fixture stays pristine). */
function tmpVault(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'vault-mcp-tools-'));
  cpSync(FIXTURE, dir, { recursive: true });
  return dir;
}

function depsFor(vault: string, extraArgs: string[] = []): ToolDeps {
  return {
    cli: parseCliArgs(['--vault', vault, ...extraArgs]),
    now: () => Date.now(),
    client: () => 'test-client',
  };
}

describe('the OFF state (privacy law 3)', () => {
  it('every tool refuses when nothing is opted in, with opt-in instructions', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'vault-mcp-off-'));
    const deps = depsFor(dir);
    for (const outcome of [
      await doSearch(deps, 'receiver tuning'),
      await doRead(deps, 'notes/Receiver basics.md'),
      await doList(deps),
      await doSave(deps, 'A note', 'body'),
    ]) {
      expect(outcome.isError).toBe(true);
      expect(outcome.structured.off).toBe(true);
      expect(outcome.text).toContain('OFF');
      expect(outcome.text).toContain('Folders the loop may read');
    }
    // and nothing was written — not even an audit file
    expect(readdirSync(dir)).toEqual([]);
  });
});

describe('doSearch', () => {
  it('returns snippets with a disclosure log for a title/alias hit', async () => {
    const vault = tmpVault();
    const outcome = await doSearch(depsFor(vault), 'receiver tuning oscillation');
    expect(outcome.isError).toBeUndefined();
    const log = outcome.structured.log as Array<{ path: string; chars: number }>;
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].path).toBe('notes/Receiver basics.md');
    // disclosure appears in the text the model/user sees
    expect(outcome.text).toContain('notes/Receiver basics.md');
    expect(outcome.text).toContain('chars');
    // never content from outside the allowlist
    expect(outcome.text).not.toContain('SECRET-TOKEN');
    expect(outcome.text).not.toContain('ROOT-TOKEN');
  });

  it('ships nothing when nothing scores (no recency/body-only leak)', async () => {
    const vault = tmpVault();
    const outcome = await doSearch(depsFor(vault), 'zebra xylophone quantum');
    expect((outcome.structured.snippets as unknown[]).length).toBe(0);
    expect(outcome.text).toContain('nothing left the vault');
  });

  it('writes an audit line for the call', async () => {
    const vault = tmpVault();
    await doSearch(depsFor(vault), 'receiver tuning');
    const audit = readFileSync(path.join(vault, 'Loop', AUDIT_BASENAME), 'utf8');
    expect(audit).toContain('search_second_brain');
    expect(audit).toContain('test-client');
  });

  it('honors --no-audit', async () => {
    const vault = tmpVault();
    await doSearch(depsFor(vault, ['--no-audit']), 'receiver tuning');
    expect(existsSync(path.join(vault, 'Loop', AUDIT_BASENAME))).toBe(false);
  });
});

describe('doRead', () => {
  it('reads allowlisted notes and audits path + chars', async () => {
    const vault = tmpVault();
    const outcome = await doRead(depsFor(vault), 'notes/Gold scanning.md');
    expect(outcome.text).toContain('Scanning timeframes');
    const audit = readFileSync(path.join(vault, 'Loop', AUDIT_BASENAME), 'utf8');
    expect(audit).toContain('read_second_brain_note');
    expect(audit).toContain('notes/Gold scanning.md');
  });
  it('refuses the private folder with a clear message', async () => {
    const vault = tmpVault();
    const outcome = await doRead(depsFor(vault), 'private/Secret plans.md');
    expect(outcome.isError).toBe(true);
    expect(outcome.text).toContain('Refused');
    expect(outcome.text).not.toContain('SECRET-TOKEN');
  });
  it('refuses dotfolder paths even under --allow override', async () => {
    const vault = tmpVault();
    const outcome = await doRead(
      depsFor(vault, ['--allow', '.obsidian']),
      '.obsidian/plugins/explicit-formula-loop/data.json',
    );
    expect(outcome.isError).toBe(true);
  });
});

describe('doList', () => {
  it('lists metadata only, allowlisted only', async () => {
    const vault = tmpVault();
    const outcome = await doList(depsFor(vault));
    const notes = outcome.structured.notes as Array<{ path: string }>;
    expect(notes.length).toBe(3);
    expect(outcome.text).not.toContain('Temperature and oscillation'); // no content
    expect(notes.some((n) => n.path.startsWith('private/'))).toBe(false);
  });
});

describe('doSave', () => {
  it('creates a note in the write-back folder with wikilinked sources', async () => {
    const vault = tmpVault();
    const outcome = await doSave(depsFor(vault), 'Receiver summary', 'What we learned.', [
      'notes/Receiver basics.md',
      'private/Secret plans.md', // not allowlisted → silently dropped from links
    ]);
    const rel = outcome.structured.path as string;
    expect(rel.startsWith('Loop/')).toBe(true);
    const content = readFileSync(path.join(vault, rel), 'utf8');
    expect(content).toContain('kind: mcp-note');
    expect(content).toContain('via: test-client');
    expect(content).toContain('[[notes/Receiver basics]]');
    expect(content).not.toContain('Secret plans');
    const audit = readFileSync(path.join(vault, 'Loop', AUDIT_BASENAME), 'utf8');
    expect(audit).toContain('save_to_second_brain');
  });

  it('never overwrites: same title twice → suffixed filename', async () => {
    const vault = tmpVault();
    const deps = depsFor(vault);
    const first = await doSave(deps, 'Same title', 'one');
    const second = await doSave(deps, 'Same title', 'two');
    expect(second.structured.path).not.toBe(first.structured.path);
    expect(readFileSync(path.join(vault, first.structured.path as string), 'utf8')).toContain('one');
    expect(readFileSync(path.join(vault, second.structured.path as string), 'utf8')).toContain('two');
  });

  it('respects --write-folder override', async () => {
    const vault = tmpVault();
    const outcome = await doSave(depsFor(vault, ['--write-folder', 'Inbox']), 'Elsewhere', 'x');
    expect((outcome.structured.path as string).startsWith('Inbox/')).toBe(true);
  });
});

describe('write-back composition', () => {
  it('composeMcpNote mirrors the plugin note shape', () => {
    const { basename, content } = composeMcpNote({
      title: 'A Thought',
      content: 'Body text.',
      sources: ['notes/Receiver basics.md'],
      dateIso: '2026-08-25 07:30',
      client: 'claude-desktop',
    });
    expect(basename).toBe('2026-08-25 a-thought');
    expect(content).toContain('kind: mcp-note');
    expect(content).toContain('## Sources');
    expect(content).toContain('[[notes/Receiver basics]]');
  });
  it('uniqueBasename suffixes from 2', () => {
    const taken = new Set(['2026-08-25 a', '2026-08-25 a 2']);
    expect(uniqueBasename(taken, '2026-08-25 a')).toBe('2026-08-25 a 3');
    expect(uniqueBasename(new Set(), 'fresh')).toBe('fresh');
  });
});
