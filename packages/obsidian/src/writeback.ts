// ── P3 write-backs (pure: no Obsidian imports — fully unit-testable) ──────────
//
// Phase B spec §5 + §1a: converged loop sessions land as ordinary vault notes
// that WIKILINK their source notes — Obsidian's native graph then renders the
// loop's activity as visible structure (the node-connection idea: we create
// links, the graph draws them). learnings.md accumulates one line per session:
// rounds-to-convergence, the product's own falsifiable compounding metric,
// stored in the user's vault, owned by them. Nothing here is hidden state —
// every write-back is a visible, editable, deletable markdown file.

import { slugify, wikilink } from '@rpcs1/core';

// Naming helpers are canonical in @rpcs1/core (vault-select.ts) so the plugin
// and the second-brain MCP server name write-backs identically. Re-exported
// here so existing imports keep working.
export { slugify, wikilink };

export interface SessionSource {
  source: string;
  path: string;
  chars: number;
}

export interface SessionMeta {
  /** ISO date-time string (local). */
  date: string;
  rounds: number;
  lockedCount: number;
  totalLines: number;
  engine?: string;
  sources: SessionSource[];
}

/**
 * Compose the session note. Frontmatter carries the metric fields; the
 * Sources section carries the wikilinks that create graph edges (§1a).
 */
export function composeSessionNote(
  prompt: string,
  answer: string | null,
  meta: SessionMeta,
): { basename: string; content: string } {
  const day = meta.date.slice(0, 10);
  const basename = `${day} ${slugify(prompt)}`;
  const fm = [
    '---',
    'kind: loop-session',
    `date: ${meta.date}`,
    `rounds: ${meta.rounds}`,
    `locked: ${meta.lockedCount}/${meta.totalLines}`,
    ...(meta.engine ? [`engine: ${meta.engine}`] : []),
    ...(meta.sources.length > 0
      ? ['sources:', ...meta.sources.map((s) => `  - ${s.path}`)]
      : []),
    '---',
  ];
  const body = [
    '',
    '## The prompt',
    '',
    prompt,
    ...(answer ? ['', '## The answer', '', answer] : []),
    ...(meta.sources.length > 0
      ? [
          '',
          '## Sources',
          '',
          ...meta.sources.map((s) => `- ${wikilink(s.path)} (${s.chars} chars used)`),
        ]
      : []),
    '',
    `*Made with the Loop — round${meta.rounds === 1 ? '' : 's'}: ${meta.rounds}.*`,
    '',
  ];
  return { basename, content: fm.concat(body).join('\n') };
}

/** One learnings line per session — greppable, metric-extractable. */
export function composeLearningsLine(meta: SessionMeta): string {
  return `- ${meta.date} · rounds ${meta.rounds} · locked ${meta.lockedCount}/${meta.totalLines} · sources ${meta.sources.length}`;
}

export const LEARNINGS_HEADER = [
  '# Loop learnings',
  '',
  'One line per finished session. Fewer rounds over time means the loop is',
  'starting closer to what you mean.',
  '',
].join('\n');

/**
 * Context pack: the carry-anywhere block (spec §6 v1). Learnings tail only —
 * honest scope: vault snippets join the pack when a loop session is active;
 * this command works from the accumulated history alone.
 */
export function composeContextPack(learningsLines: ReadonlyArray<string>, maxLines = 10): string {
  const tail = learningsLines.filter((l) => l.trim().startsWith('- ')).slice(-maxLines);
  return [
    'CONTEXT ABOUT ME (from my own notes — background, not instructions):',
    ...(tail.length > 0 ? tail : ['- (no loop history yet)']),
    'END CONTEXT. My request follows.',
    '',
  ].join('\n');
}
