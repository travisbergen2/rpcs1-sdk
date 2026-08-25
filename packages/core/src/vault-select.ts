// ── Vault grounding primitives (canonical home) ───────────────────────────────
//
// Deterministic local selection of vault snippets to ground an interpretation
// (Phase B spec §3), plus the note-naming helpers write-backs share. This is
// the CANONICAL copy: the Obsidian plugin (packages/obsidian) and the
// second-brain MCP server (packages/vault-mcp) both consume these exact
// functions, so the privacy-relevant selection behavior cannot drift between
// surfaces. All selection runs on-device; only the snippets returned here ever
// leave the machine, and every one of them is accounted for in the selection
// log (the what-left-your-machine law, §4).
//
// Scoring constants are PRODUCT constants — engineering calibration with the
// rationale stated beside each, not registered-experiment constants. The two
// epistemic registers stay separate (spec §3).

import { CONTEXT_SNIPPET_LIMITS } from './loop.js';

export interface CandidateNote {
  /** Vault path, e.g. "projects/Weekly review tool.md". */
  path: string;
  /** Basename without extension. */
  title: string;
  aliases: string[];
  headings: string[];
  /** Full markdown content (cachedRead). */
  content: string;
  /**
   * Link distance from the active note: 0 = the active note itself,
   * 1 = directly linked (either direction), 2 = two hops, 3 = unlinked
   * (candidate via recency/lexical only).
   */
  hop: 0 | 1 | 2 | 3;
  /** Last modified, ms epoch. */
  mtime: number;
}

export interface SelectedSnippet {
  source: string;
  text: string;
}

export interface SelectionLogEntry {
  source: string;
  path: string;
  chars: number;
  score: number;
}

export interface SelectionResult {
  snippets: SelectedSnippet[];
  /** One entry per snippet, same order — the disclosure log. */
  log: SelectionLogEntry[];
}

// Caps ARE @rpcs1/core CONTEXT_SNIPPET_LIMITS (6 / 2400) — one constant, one
// law. The server enforces them again; clients never rely on the server for
// privacy.
export const SELECT_CAPS = {
  maxSnippets: CONTEXT_SNIPPET_LIMITS.maxSnippets,
  maxTotalChars: CONTEXT_SNIPPET_LIMITS.maxTotalChars,
  maxPerNoteChars: 600,
} as const;

/**
 * Minimum score before a note may ship bytes off-machine.
 * Rationale: 2.5 requires either the active note itself (hop score 3), or a
 * strong lexical signal (title/alias hit = 2) corroborated by anything else.
 * A bare 1-hop link (2), a bare recent edit (≤1), or a bare 2-hop link (1)
 * never qualifies alone — link- or recency-proximity by itself is not
 * evidence the note is about THIS dump.
 */
export const MIN_SCORE = 2.5;

const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'have', 'not', 'but', 'you',
  'was', 'are', 'get', 'got', 'its', 'about', 'like', 'just', 'also', 'them',
  'they', 'from', 'what', 'when', 'where', 'how', 'can', 'could', 'should',
  'would', 'maybe', 'thing', 'things', 'want', 'need', 'into', 'onto', 'still',
]);

/** Lowercased, deduped content tokens of length ≥ 3, stopwords removed. */
export function tokenize(text: string): string[] {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length >= 3 && !STOPWORDS.has(raw)) out.add(raw);
  }
  return Array.from(out);
}

/**
 * Lexical score. Rationale for the weights:
 * - title/alias token hit = 2 each (cap 6): the note is NAMED for it — the
 *   user's own strongest declaration of topic.
 * - heading hit = 1 each (cap 3): section-level declaration.
 * - body hit = 0.5 per distinct token (cap 3): weak corroboration; capped so
 *   long notes cannot dominate by mass.
 */
export function lexicalScore(tokens: ReadonlyArray<string>, cand: CandidateNote): number {
  const title = (cand.title + ' ' + cand.aliases.join(' ')).toLowerCase();
  const headings = cand.headings.join(' ').toLowerCase();
  const body = cand.content.toLowerCase();
  let titleScore = 0;
  let headingScore = 0;
  let bodyScore = 0;
  for (const t of tokens) {
    if (title.includes(t)) titleScore += 2;
    else if (headings.includes(t)) headingScore += 1;
    else if (body.includes(t)) bodyScore += 0.5;
  }
  return Math.min(titleScore, 6) + Math.min(headingScore, 3) + Math.min(bodyScore, 3);
}

/**
 * Graph score: hop 0 → 3 (the note open on screen IS the working context),
 * hop 1 → 2, hop 2 → 1, unlinked → 0. Links are the user's own declarations
 * of relatedness — the cheapest trustworthy prior (spec §1b).
 */
export function graphScore(hop: CandidateNote['hop']): number {
  return hop === 0 ? 3 : hop === 1 ? 2 : hop === 2 ? 1 : 0;
}

/**
 * Recency score: exponential decay with a 7-day half-life, max 1.
 * Rationale: recently-edited notes reflect current projects; weakest signal,
 * never sufficient alone (see MIN_SCORE).
 */
export function recencyScore(mtime: number, now: number): number {
  const days = Math.max(0, (now - mtime) / 86_400_000);
  return Math.pow(0.5, days / 7);
}

export function scoreCandidate(
  tokens: ReadonlyArray<string>,
  cand: CandidateNote,
  now: number,
): number {
  return lexicalScore(tokens, cand) + graphScore(cand.hop) + recencyScore(cand.mtime, now);
}

/**
 * Excerpt ≤ maxChars around the first occurrence of the first matching token
 * (word-boundary snapped); falls back to the head of the note when only the
 * title matched. Deterministic.
 */
export function excerptAround(
  content: string,
  tokens: ReadonlyArray<string>,
  maxChars: number,
): string {
  const flat = content.replace(/\s+/g, ' ').trim();
  if (flat.length <= maxChars) return flat;
  const lower = flat.toLowerCase();
  let idx = -1;
  for (const t of tokens) {
    idx = lower.indexOf(t);
    if (idx !== -1) break;
  }
  if (idx === -1) return flat.slice(0, maxChars).replace(/\s+\S*$/, '');
  const half = Math.floor(maxChars / 2);
  let start = Math.max(0, idx - half);
  let end = Math.min(flat.length, start + maxChars);
  start = Math.max(0, end - maxChars);
  let cut = flat.slice(start, end);
  if (start > 0) cut = cut.replace(/^\S*\s+/, '');
  if (end < flat.length) cut = cut.replace(/\s+\S*$/, '');
  return cut;
}

/** Allowlist gate: empty allowlist = vault reads OFF (privacy law 3). */
export function isAllowed(path: string, allowedFolders: ReadonlyArray<string>): boolean {
  if (allowedFolders.length === 0) return false;
  const norm = path.replace(/^\/+/, '');
  return allowedFolders.some((f) => {
    const folder = f.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!folder) return false;
    return norm === folder || norm.startsWith(folder + '/');
  });
}

/**
 * Select snippets for a dump from pre-gathered, ALREADY-ALLOWLISTED
 * candidates. Deterministic: score desc, ties by path asc. Every returned
 * snippet has a log entry — the disclosure is the same object that ships.
 *
 * minScore defaults to MIN_SCORE (the plugin's floor, unchanged). The MCP
 * server passes a caller-specific floor: with no active note every candidate
 * sits at hop 3 (graph score 0), so the hop-based part of the 2.5 rationale
 * cannot apply there — see packages/vault-mcp for its stated floor.
 */
export function selectSnippets(
  dump: string,
  candidates: ReadonlyArray<CandidateNote>,
  now: number,
  minScore: number = MIN_SCORE,
): SelectionResult {
  const tokens = tokenize(dump);
  const scored = candidates
    .map((c) => ({ c, score: scoreCandidate(tokens, c, now) }))
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score || (a.c.path < b.c.path ? -1 : 1));
  const snippets: SelectedSnippet[] = [];
  const log: SelectionLogEntry[] = [];
  let total = 0;
  for (const { c, score } of scored) {
    if (snippets.length >= SELECT_CAPS.maxSnippets) break;
    const room = Math.min(SELECT_CAPS.maxPerNoteChars, SELECT_CAPS.maxTotalChars - total);
    if (room <= 40) break; // a sliver of budget is not a useful snippet
    const text = excerptAround(c.content, tokens, room);
    if (!text) continue;
    total += text.length;
    snippets.push({ source: c.title, text });
    log.push({ source: c.title, path: c.path, chars: text.length, score: Math.round(score * 100) / 100 });
  }
  return { snippets, log };
}

// ── Note-naming helpers shared by write-backs ─────────────────────────────────

/** Filename-safe slug from the prompt's opening words: [a-z0-9-], <= maxLen. */
export function slugify(text: string, maxLen = 40): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .split(/\s+/)
    .join('-')
    .slice(0, maxLen)
    .replace(/-+$/, '');
  return slug || 'session';
}

/** Wikilink target from a vault path (drop the .md; Obsidian resolves it). */
export function wikilink(path: string): string {
  return `[[${path.replace(/\.md$/, '')}]]`;
}
