// ── Vault filesystem layer ────────────────────────────────────────────────────
//
// Reads an Obsidian vault (or any folder of .md notes) straight from disk —
// Obsidian does not need to be running. Every read passes two independent
// gates, in this order:
//
//   1. Path safety: relative, no dot-segments (no `.obsidian`, no `.git`, no
//      hidden anything), and — after resolution, following symlinks — still
//      inside the vault. Hard rule, not configurable.
//   2. The allowlist (isAllowed from @rpcs1/core — the same gate the plugin
//      uses). Empty allowlist = OFF.
//
// Candidate enumeration is capped by recency (CANDIDATE_CAP most recently
// modified allowlisted notes). Rationale: a per-call full-text pass over an
// unbounded vault is O(vault) on every search; recent notes reflect current
// projects, and the model can always read a specific older note by path.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { isAllowed, type CandidateNote } from '@rpcs1/core';

/** Max entries returned by list_second_brain per call. */
export const LIST_CAP = 200;
/** Most-recent allowlisted notes scanned per search call. */
export const CANDIDATE_CAP = 500;
/** Max characters returned by read_second_brain_note per call. */
export const READ_CAP = 8000;

export class VaultPathError extends Error {}

/** True when any path component starts with '.' (hidden files, .obsidian, traversal dots). */
export function hasDotSegment(rel: string): boolean {
  return rel.split(/[\\/]+/).some((seg) => seg.startsWith('.'));
}

/**
 * Resolve a note path safely inside the vault. Rejects absolute paths,
 * dot-segments, and anything that escapes the vault root after resolving
 * symlinks. Returns the absolute path of an EXISTING file.
 */
export async function safeResolve(vaultRoot: string, rel: string): Promise<string> {
  if (!rel || typeof rel !== 'string') throw new VaultPathError('Empty path.');
  if (path.isAbsolute(rel)) throw new VaultPathError('Paths must be relative to the vault.');
  if (hasDotSegment(rel)) {
    throw new VaultPathError('Paths may not contain hidden segments ("." prefixed) — that includes .obsidian.');
  }
  const abs = path.resolve(vaultRoot, rel);
  const rootWithSep = vaultRoot.endsWith(path.sep) ? vaultRoot : vaultRoot + path.sep;
  if (!abs.startsWith(rootWithSep)) throw new VaultPathError('Path escapes the vault.');
  let real: string;
  try {
    real = await fs.realpath(abs);
  } catch {
    throw new VaultPathError(`Note not found: ${rel}`);
  }
  if (!(real === vaultRoot || real.startsWith(rootWithSep))) {
    throw new VaultPathError('Path escapes the vault (symlink).');
  }
  return real;
}

export interface NoteStat {
  /** Vault-relative path with forward slashes (Obsidian convention). */
  path: string;
  /** Basename without extension. */
  title: string;
  mtime: number;
}

/** Enumerate all .md files under the vault, skipping every dot-directory. */
export async function walkMarkdown(vaultRoot: string): Promise<NoteStat[]> {
  const out: NoteStat[] = [];
  async function walk(dirAbs: string, relPrefix: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dirAbs, { withFileTypes: true });
    } catch {
      return; // unreadable directory: skip, never crash a tool call
    }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue; // .obsidian, .git, .trash, hidden
      const rel = relPrefix ? `${relPrefix}/${e.name}` : e.name;
      const abs = path.join(dirAbs, e.name);
      if (e.isDirectory()) {
        await walk(abs, rel);
      } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
        try {
          const st = await fs.stat(abs);
          out.push({ path: rel, title: e.name.replace(/\.md$/i, ''), mtime: st.mtimeMs });
        } catch {
          // vanished between readdir and stat: skip
        }
      }
    }
  }
  await walk(vaultRoot, '');
  return out;
}

/**
 * Frontmatter aliases, tolerantly parsed (no YAML dependency). Handles:
 *   aliases: [a, b]         — inline array
 *   aliases: single name    — inline scalar
 *   aliases:                — block list
 *     - a
 *     - b
 */
export function parseAliases(content: string): string[] {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (!fm) return [];
  const lines = fm[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^aliases:\s*(.*)$/.exec(lines[i]);
    if (!m) continue;
    const rest = m[1].trim();
    if (rest.startsWith('[')) {
      return rest
        .replace(/^\[/, '')
        .replace(/\]$/, '')
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    }
    if (rest) return [rest.replace(/^["']|["']$/g, '')].filter(Boolean);
    const block: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const item = /^\s+-\s+(.+)$/.exec(lines[j]);
      if (!item) break;
      block.push(item[1].trim().replace(/^["']|["']$/g, ''));
    }
    return block.filter(Boolean);
  }
  return [];
}

/** Markdown headings (#..######), text only. */
export function parseHeadings(content: string): string[] {
  const out: string[] = [];
  for (const m of content.matchAll(/^#{1,6}\s+(.+)$/gm)) out.push(m[1].trim());
  return out;
}

/** List allowlisted notes (metadata only), newest first, capped. */
export async function listNotes(
  vaultRoot: string,
  allowedFolders: ReadonlyArray<string>,
  folder?: string,
): Promise<{ notes: NoteStat[]; total: number }> {
  const all = await walkMarkdown(vaultRoot);
  const prefix = folder ? folder.replace(/^\/+/, '').replace(/\/+$/, '') : null;
  const allowed = all.filter(
    (n) =>
      isAllowed(n.path, allowedFolders) &&
      (!prefix || n.path === prefix || n.path.startsWith(prefix + '/')),
  );
  allowed.sort((a, b) => b.mtime - a.mtime || (a.path < b.path ? -1 : 1));
  return { notes: allowed.slice(0, LIST_CAP), total: allowed.length };
}

/**
 * Build selector candidates from the allowlisted notes: the CANDIDATE_CAP
 * most recently modified, fully read, with aliases + headings parsed. hop is
 * always 3 — there is no "active note" in an MCP session, so graph proximity
 * contributes nothing here (see SERVER_MIN_SCORE rationale in tools.ts).
 */
export async function buildCandidates(
  vaultRoot: string,
  allowedFolders: ReadonlyArray<string>,
): Promise<CandidateNote[]> {
  const all = await walkMarkdown(vaultRoot);
  const allowed = all.filter((n) => isAllowed(n.path, allowedFolders));
  allowed.sort((a, b) => b.mtime - a.mtime || (a.path < b.path ? -1 : 1));
  const picked = allowed.slice(0, CANDIDATE_CAP);
  const out: CandidateNote[] = [];
  for (const n of picked) {
    let content: string;
    try {
      content = await fs.readFile(path.join(vaultRoot, n.path), 'utf8');
    } catch {
      continue;
    }
    out.push({
      path: n.path,
      title: n.title,
      aliases: parseAliases(content),
      headings: parseHeadings(content),
      content,
      hop: 3,
      mtime: n.mtime,
    });
  }
  return out;
}

export interface ReadResult {
  path: string;
  text: string;
  totalChars: number;
  offset: number;
  truncated: boolean;
}

/** Read one allowlisted note with a per-call character cap and offset. */
export async function readNote(
  vaultRoot: string,
  allowedFolders: ReadonlyArray<string>,
  relPath: string,
  offset = 0,
  maxChars = READ_CAP,
): Promise<ReadResult> {
  const norm = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!isAllowed(norm, allowedFolders)) {
    throw new VaultPathError(
      allowedFolders.length === 0
        ? 'Vault reads are off (no folders are allowed).'
        : `Not in the allowed folders: ${norm}`,
    );
  }
  const abs = await safeResolve(vaultRoot, norm);
  const content = await fs.readFile(abs, 'utf8');
  const start = Math.max(0, Math.floor(offset));
  const text = content.slice(start, start + maxChars);
  return {
    path: norm,
    text,
    totalChars: content.length,
    offset: start,
    truncated: start + text.length < content.length,
  };
}
