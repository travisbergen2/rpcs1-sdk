// ── P5 topic wiring (pure: no Obsidian imports — fully unit-testable) ─────────
//
// "Wire my archive into topics": archive-index stubs gain wikilinks to
// auto-generated Notes/Topics/ hub notes, collapsing the disconnected
// stub point-cloud into topic-centered clusters in the graph view.
//
// EARNED SCOPE (E-WIRE-1, 2026-08-27, frozen-grammar verdict FAIL):
// this is a GRAPH-LEGIBILITY feature, not a retrieval feature. The
// pre-registered test found hubs compete with stubs for the search's
// 6-snippet budget (E3 displacement 7/15) even though reach improved
// when hubs surfaced (E2 +0.26). Do not claim retrieval gains for this
// wiring; the reserved-hub-lane server change (E-WIRE-2 candidate) is
// where that claim would be re-tested.
//
// Mechanics: parse each stub's "**Topics matched:**" line; terms with ≥2
// member stubs get a hub note listing members as wikilinks; each stub gains
// ONE appended "**Topics:**" line (idempotent — skipped if present). Hubs
// are regenerable; stub patches are append-once.

export interface StubIn { path: string; content: string }
export interface FileOut { path: string; content: string }
export interface WiringPlan {
  hubs: FileOut[];
  patches: { path: string; content: string }[];
  counts: { stubs: number; patched: number; hubs: number; terms: number };
}

/** Stem terms from the import vocabulary get human topic labels. */
export const TOPIC_LABELS: Record<string, string> = {
  'preregist': 'preregistration',
  'pre-regist': 'preregistration',
  'falsifi': 'falsifiability',
};

const HUB_MIN_MEMBERS = 2;

export function parseStubTerms(content: string): string[] {
  const m = /\*\*Topics matched:\*\* (.+)$/m.exec(content);
  if (!m) return [];
  return [...new Set(
    m[1].split(',').map((t) => (TOPIC_LABELS[t.trim()] ?? t.trim())).filter(Boolean),
  )];
}

export function planTopicWiring(stubs: StubIn[]): WiringPlan {
  const members = new Map<string, { path: string; title: string; date: string }[]>();
  const patches: WiringPlan['patches'] = [];
  let considered = 0;

  for (const stub of stubs) {
    const terms = parseStubTerms(stub.content);
    if (!terms.length) continue;
    considered++;
    const title = (/^# (.+)$/m.exec(stub.content) ?? [, '(untitled)'])[1] as string;
    const date = ((/^date: (.+)$/m.exec(stub.content) ?? [, '?'])[1] as string).slice(0, 10);
    for (const t of terms) {
      if (!members.has(t)) members.set(t, []);
      members.get(t)!.push({ path: stub.path.replace(/\.md$/, ''), title, date });
    }
    if (!stub.content.includes('**Topics:**')) {
      const links = terms.map((t) => `[[Notes/Topics/${t}|${t}]]`).join(', ');
      patches.push({ path: stub.path, content: stub.content.trimEnd() + `\n\n**Topics:** ${links}\n` });
    }
  }

  const hubs: FileOut[] = [];
  for (const [t, list] of members) {
    if (list.length < HUB_MIN_MEMBERS) continue;
    const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : 1));
    hubs.push({
      path: `Notes/Topics/${t}.md`,
      content: [
        '---', 'kind: topic', `aliases: [${t}]`, '---', '',
        `# ${t}`, '',
        `Archive conversations that touched **${t}** (${list.length}). Auto-generated`,
        'by topic wiring — regenerated on each run; edits here do not persist.', '',
        '## Threads', '',
        ...sorted.map((e) => `- [[${e.path}|${e.title} (${e.date})]]`),
        '',
      ].join('\n'),
    });
  }

  return { hubs, patches, counts: { stubs: considered, patched: patches.length, hubs: hubs.length, terms: members.size } };
}
