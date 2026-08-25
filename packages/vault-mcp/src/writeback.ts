// ── MCP write-backs: notes any AI can add to the graph ───────────────────────
//
// Same contract as the plugin's P3 session notes: everything written is a
// visible, editable, deletable markdown file, confined to the write-back
// folder, that WIKILINKS the notes it drew from — so work done in Claude
// Desktop / Cursor / any MCP app appears in the user's Obsidian graph wired
// into the knowledge it used. Naming uses the same canonical slugify/wikilink
// as the plugin (@rpcs1/core), so both surfaces cohabit one folder cleanly.
// This tool CREATES only: no overwrites, no arbitrary paths, no deletes.

import { slugify, wikilink } from '@rpcs1/core';

export interface McpNoteInput {
  title: string;
  content: string;
  /** Vault paths of notes this content drew from (become graph edges). */
  sources: string[];
  /** ISO date-time (local). */
  dateIso: string;
  /** The connected AI app's self-reported name (MCP clientInfo). */
  client: string;
}

/** Compose the note. Frontmatter mirrors the plugin's session notes. */
export function composeMcpNote(input: McpNoteInput): { basename: string; content: string } {
  const day = input.dateIso.slice(0, 10);
  const basename = `${day} ${slugify(input.title)}`;
  const fm = [
    '---',
    'kind: mcp-note',
    `date: ${input.dateIso}`,
    `via: ${input.client}`,
    ...(input.sources.length > 0 ? ['sources:', ...input.sources.map((s) => `  - ${s}`)] : []),
    '---',
  ];
  const body = [
    '',
    `# ${input.title.trim()}`,
    '',
    input.content.trim(),
    ...(input.sources.length > 0
      ? ['', '## Sources', '', ...input.sources.map((s) => `- ${wikilink(s)}`)]
      : []),
    '',
    `*Saved by ${input.client} through the second brain.*`,
    '',
  ];
  return { basename, content: fm.concat(body).join('\n') };
}

/** First basename not in `existing` — "name", "name 2", "name 3", … */
export function uniqueBasename(existing: ReadonlySet<string>, basename: string): string {
  if (!existing.has(basename)) return basename;
  for (let i = 2; ; i++) {
    const candidate = `${basename} ${i}`;
    if (!existing.has(candidate)) return candidate;
  }
}
