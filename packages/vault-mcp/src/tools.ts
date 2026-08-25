// ── Tool handlers (pure of MCP transport — fully unit-testable) ───────────────
//
// Each handler resolves the live config (re-reading the plugin's settings
// file), enforces the gates, produces the disclosure INSIDE the result, and
// appends the vault-side audit line. The MCP layer in index.ts is a thin
// wrapper around these.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { selectSnippets, SELECT_CAPS, isAllowed } from '@rpcs1/core';
import { effectiveConfig, type CliOptions, type EffectiveConfig } from './config.js';
import {
  buildCandidates,
  listNotes,
  readNote,
  walkMarkdown,
  READ_CAP,
  VaultPathError,
} from './vault.js';
import { appendAudit, auditLine } from './audit.js';
import { composeMcpNote, uniqueBasename } from './writeback.js';

/**
 * Minimum selection score for the MCP surface.
 * Rationale: the plugin's floor (2.5) was calibrated with graph proximity in
 * the sum — "title hit (2) corroborated by anything else". In an MCP session
 * there is no active note, so every candidate sits at hop 3 (graph score 0)
 * and the corroboration term the 2.5 assumed is structurally absent. 2.0 keeps
 * the same law — a title/alias hit alone qualifies (the note is NAMED for the
 * query: the user's own strongest declaration of topic), while bare recency
 * (≤1) or bare body echoes (≤1.5 capped + stale recency) still never ship.
 */
export const SERVER_MIN_SCORE = 2.0;

/** Everything a handler needs; injected so tests control time and identity. */
export interface ToolDeps {
  cli: CliOptions;
  now: () => number;
  /** Connected AI app's name from MCP clientInfo (e.g. "claude-desktop"). */
  client: () => string;
}

export interface ToolOutcome {
  /** Machine-readable result (returned as structuredContent). */
  structured: Record<string, unknown>;
  /** Human/model-readable summary (returned as text content). */
  text: string;
  /** True when the call was refused (gate) rather than served. */
  isError?: boolean;
}

function localIso(nowMs: number): string {
  const d = new Date(nowMs);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const OPT_IN_HOW = [
  'Nothing was read and nothing left the vault. The user has not opted any folders in.',
  'To opt in, they can either:',
  '1. In Obsidian: Settings → "Explicit Formula — The Loop" → "Folders the loop may read" (takes effect immediately, no restart), or',
  '2. Start this server with --allow "folder1,folder2".',
  'Relay this to the user; do not try other paths.',
].join('\n');

function offOutcome(): ToolOutcome {
  return {
    structured: { off: true, allowlistSource: 'off' },
    text: `Vault reads are OFF. ${OPT_IN_HOW}`,
    isError: true,
  };
}

async function audit(deps: ToolDeps, cfg: EffectiveConfig, tool: string, summary: string): Promise<string> {
  if (!deps.cli.auditEnabled) return '';
  const line = auditLine(localIso(deps.now()), deps.client(), tool, summary);
  const res = await appendAudit(deps.cli.vaultPath, cfg.writeBackFolder, line);
  return res.ok ? '' : `\n(Note: the vault-side audit log could not be written: ${res.error})`;
}

// ── search_second_brain ───────────────────────────────────────────────────────

export async function doSearch(deps: ToolDeps, query: string): Promise<ToolOutcome> {
  const cfg = effectiveConfig(deps.cli);
  if (cfg.allowedFolders.length === 0) return offOutcome();

  const candidates = await buildCandidates(deps.cli.vaultPath, cfg.allowedFolders);
  const { snippets, log } = selectSnippets(query, candidates, deps.now(), SERVER_MIN_SCORE);

  const totalChars = log.reduce((a, l) => a + l.chars, 0);
  const summary =
    snippets.length === 0
      ? `"${query.slice(0, 80)}" → 0 snippets`
      : `"${query.slice(0, 80)}" → ${snippets.length} snippet${snippets.length === 1 ? '' : 's'}, ${totalChars} chars (${log.map((l) => l.path).join(', ')})`;
  const auditNote = await audit(deps, cfg, 'search_second_brain', summary);

  if (snippets.length === 0) {
    return {
      structured: { snippets: [], log: [], allowlistSource: cfg.allowlistSource },
      text:
        'No notes scored high enough to share for that query (nothing left the vault). ' +
        'Try more specific words the user would actually use in their own note titles or headings, ' +
        'or list_second_brain to browse what is available.' +
        auditNote,
    };
  }

  const lines = [
    `From the user's own notes — ${snippets.length} snippet${snippets.length === 1 ? '' : 's'}, ${totalChars} chars shared:`,
    ...log.map((l) => `  · ${l.path} (${l.chars} chars, score ${l.score})`),
    '',
    ...snippets.map((s) => `[${s.source}]\n${s.text}`),
  ];
  return {
    structured: {
      snippets: snippets as unknown as Record<string, unknown>[],
      log: log as unknown as Record<string, unknown>[],
      allowlistSource: cfg.allowlistSource,
    } as unknown as Record<string, unknown>,
    text: lines.join('\n') + auditNote,
  };
}

// ── read_second_brain_note ────────────────────────────────────────────────────

export async function doRead(deps: ToolDeps, relPath: string, offset = 0): Promise<ToolOutcome> {
  const cfg = effectiveConfig(deps.cli);
  if (cfg.allowedFolders.length === 0) return offOutcome();

  try {
    const res = await readNote(deps.cli.vaultPath, cfg.allowedFolders, relPath, offset, READ_CAP);
    const auditNote = await audit(
      deps,
      cfg,
      'read_second_brain_note',
      `${res.path} (${res.text.length} of ${res.totalChars} chars, offset ${res.offset})`,
    );
    const cont = res.truncated
      ? `\n\n[truncated — note is ${res.totalChars} chars; call again with offset=${res.offset + res.text.length}]`
      : '';
    return {
      structured: { ...res } as unknown as Record<string, unknown>,
      text: `${res.path} (${res.totalChars} chars total, showing ${res.offset}–${res.offset + res.text.length}):\n\n${res.text}${cont}${auditNote}`,
    };
  } catch (e) {
    if (e instanceof VaultPathError) {
      return { structured: { error: e.message }, text: `Refused: ${e.message}`, isError: true };
    }
    throw e;
  }
}

// ── list_second_brain ─────────────────────────────────────────────────────────

export async function doList(deps: ToolDeps, folder?: string): Promise<ToolOutcome> {
  const cfg = effectiveConfig(deps.cli);
  if (cfg.allowedFolders.length === 0) return offOutcome();

  const { notes, total } = await listNotes(deps.cli.vaultPath, cfg.allowedFolders, folder);
  const auditNote = await audit(
    deps,
    cfg,
    'list_second_brain',
    `${folder ? `folder "${folder}"` : 'all allowed folders'} → ${notes.length} of ${total} paths`,
  );
  const shown = notes.map((n) => ({ path: n.path, title: n.title, modified: new Date(n.mtime).toISOString().slice(0, 10) }));
  return {
    structured: {
      notes: shown as unknown as Record<string, unknown>[],
      total,
      allowedFolders: cfg.allowedFolders,
      allowlistSource: cfg.allowlistSource,
    } as unknown as Record<string, unknown>,
    text:
      `${total} note${total === 1 ? '' : 's'} in the allowed folders (${cfg.allowedFolders.join(', ')})` +
      `${folder ? `, filtered to "${folder}"` : ''}${total > notes.length ? `, newest ${notes.length} shown` : ''}:\n` +
      shown.map((n) => `  ${n.path} (${n.modified})`).join('\n') +
      auditNote,
  };
}

// ── save_to_second_brain ──────────────────────────────────────────────────────

export async function doSave(
  deps: ToolDeps,
  title: string,
  content: string,
  sources: string[] = [],
): Promise<ToolOutcome> {
  const cfg = effectiveConfig(deps.cli);
  // One switch governs the whole connection: an un-opted-in vault takes no
  // writes either. (Writes are additionally confined to the write-back folder.)
  if (cfg.allowedFolders.length === 0) return offOutcome();

  // Sources become wikilinks (graph edges): keep only allowlisted, known-shape paths.
  const cleanSources = sources
    .map((s) => s.replace(/\\/g, '/').replace(/^\/+/, '').trim())
    .filter((s) => s.length > 0 && isAllowed(s, cfg.allowedFolders))
    .slice(0, 12);

  const note = composeMcpNote({
    title,
    content,
    sources: cleanSources,
    dateIso: localIso(deps.now()),
    client: deps.client(),
  });

  const dirAbs = path.join(deps.cli.vaultPath, cfg.writeBackFolder);
  await fs.mkdir(dirAbs, { recursive: true });
  const existing = new Set(
    (await walkMarkdown(deps.cli.vaultPath))
      .filter((n) => n.path.startsWith(cfg.writeBackFolder + '/'))
      .map((n) => n.title),
  );
  const basename = uniqueBasename(existing, note.basename);
  const relPath = `${cfg.writeBackFolder}/${basename}.md`;
  await fs.writeFile(path.join(deps.cli.vaultPath, relPath), note.content, { flag: 'wx' });

  const auditNote = await audit(
    deps,
    cfg,
    'save_to_second_brain',
    `wrote ${relPath} (${note.content.length} chars, ${cleanSources.length} source link${cleanSources.length === 1 ? '' : 's'})`,
  );
  return {
    structured: { path: relPath, chars: note.content.length, sources: cleanSources },
    text:
      `Saved to the user's second brain: ${relPath} (${note.content.length} chars)` +
      (cleanSources.length > 0 ? `, linked to: ${cleanSources.join(', ')}` : '') +
      '. It appears in their Obsidian graph and is theirs to edit or delete.' +
      auditNote,
  };
}
