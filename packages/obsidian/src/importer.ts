// ── P4 importer core (pure: no Obsidian imports — fully unit-testable) ────────
//
// "Import my AI history": ChatGPT and Claude data exports become vault notes,
// with the same law as the CLI importer this ports (import_exports.mjs,
// proven on 2,120 real conversations, 2026-08-25):
//
//   · EVERY conversation lands under  Private/Archive/<source>/  — Private is
//     never allowlisted, so no connected AI can read any of it.
//   · Conversations matching the research/build vocabulary (positive
//     selection; personal material is never selected) get an INDEX STUB in
//     Notes/Archive index/ — title, date, topic terms ONLY. No content.
//   · An import report lists "possibly forgotten threads": research
//     conversations whose topics are rare across the whole history.
//
// This module only PLANS (paths + contents). The modal executes vault writes,
// so every function here stays deterministic and testable.

import { slugify } from '@rpcs1/core';

export interface RawTurn { who: 'You' | 'Assistant'; text: string }
export interface RawConvo { title: string; dateIso: string; turns: RawTurn[] }
export interface FileOut { path: string; content: string }
export interface ImportPlan {
  archives: FileOut[];
  stubs: FileOut[];
  report: FileOut;
  counts: { total: number; indexed: number; forgotten: number };
}
export type Payload =
  | { kind: 'claude'; convos: RawConvo[] }
  | { kind: 'openai'; convos: RawConvo[] }
  | { kind: 'claude-manifest'; conversationsUrl: string | null }
  | { kind: 'unknown'; structuralMap: string };

// ── positive-selection vocabulary: research/build terms ONLY ─────────────────
export const VOCAB = [
  'imm', 'rpcs', 'receiver', 'riemann', 'zeta', 'spectral', 'toeplitz', 'weil',
  'manifold', 'observer', 'entropy', 'eigenvalue', 'born rule', 'lorentzian',
  'yang-mills', 'mass gap', 'nyman', 'beurling', 'verblunsky', 'mertens',
  'e-lit', 'e-dyad', 'e-circ', 'e-tail', 'e-born', 'e-sol', 'e-comp', 'e-prop',
  'preregist', 'pre-regist', 'claim ledger', 'kill-gate', 'falsifi',
  'obsidian', 'mcp', 'second brain', 'explicit formula', 'tuner', 'translator',
  'temporal integration', 'signal gain', 'filter threshold', 'update elasticity',
  'ambiguity resolution', 'oscillation', 'overload', 'freeze',
  'trading', 'xauusd', 'backtest', 'kelly', 'drawdown', 'prop firm',
  'tradelocker', 'aquafunded', 'walk-forward', 'sharpe',
  'nl2build', 'apk', 'sdk', 'npm', 'vercel', 'github', 'zenodo', 'latex',
  'theorem', 'lemma', 'conjecture', 'axiom', 'markov', 'stochastic',
];
export const MIN_DISTINCT_TERMS = 3;

const day = (iso: string) => (iso ? String(iso).slice(0, 10) : 'undated');
const esc = (s: unknown) => String(s ?? '').replace(/\r\n/g, '\n');

// ── payload detection (tolerant across export vintages) ──────────────────────
function listFrom(raw: unknown, looks: (c: Record<string, unknown>) => boolean): Record<string, unknown>[] | null {
  if (Array.isArray(raw)) {
    return raw.length === 0 || looks(raw[0] as Record<string, unknown>) ? (raw as Record<string, unknown>[]) : null;
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.conversations)) return obj.conversations as Record<string, unknown>[];
    for (const v of Object.values(obj)) {
      if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === 'object') && looks(v[0] as Record<string, unknown>)) {
        return v as Record<string, unknown>[];
      }
    }
  }
  return null;
}

const looksClaude = (c: Record<string, unknown>) => 'chat_messages' in c || ('uuid' in c && 'name' in c);
const looksOpenAI = (c: Record<string, unknown>) => 'mapping' in c;

/** Keys-and-types map for the unknown case — never content. */
export function structuralMap(raw: unknown): string {
  const t = (v: unknown) => (Array.isArray(v) ? `array[${v.length}]` : v === null ? 'null' : typeof v);
  const lines = [`top level: ${t(raw)}`];
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>).slice(0, 12)) lines.push(`  ${k}: ${t(v)}`);
  } else if (Array.isArray(raw) && raw.length) {
    lines.push('  first element keys: ' + Object.keys((raw[0] as object) || {}).slice(0, 12).join(', '));
  }
  return lines.join('\n');
}

export function detectPayload(raw: unknown): Payload {
  // New-format Claude manifest: { data_files: [{export_url, category, ...}] }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data_files) && (obj.data_files as Record<string, unknown>[]).some((f) => f && typeof f === 'object' && 'export_url' in f)) {
      const files = obj.data_files as Record<string, unknown>[];
      const conv = files.find((f) => f.category === 'conversations') || files.find((f) => String(f.filename || '').includes('conversation'));
      return { kind: 'claude-manifest', conversationsUrl: conv ? String(conv.export_url) : null };
    }
  }
  const claudeList = listFrom(raw, looksClaude);
  if (claudeList && claudeList.length && looksClaude(claudeList[0])) {
    return { kind: 'claude', convos: normalizeClaude(claudeList) };
  }
  const openaiList = listFrom(raw, looksOpenAI);
  if (openaiList && openaiList.length && looksOpenAI(openaiList[0])) {
    return { kind: 'openai', convos: normalizeOpenAI(openaiList) };
  }
  return { kind: 'unknown', structuralMap: structuralMap(raw) };
}

// ── normalizers → RawConvo ────────────────────────────────────────────────────
export function normalizeClaude(list: Record<string, unknown>[]): RawConvo[] {
  return list.map((c) => ({
    title: String(c.name || '(untitled)'),
    dateIso: String(c.created_at || ''),
    turns: (Array.isArray(c.chat_messages) ? (c.chat_messages as Record<string, unknown>[]) : [])
      .map((m) => ({
        who: (m.sender === 'human' ? 'You' : 'Assistant') as RawTurn['who'],
        text: esc(m.text || ''),
      }))
      .filter((t) => t.text.trim()),
  }));
}

export function normalizeOpenAI(list: Record<string, unknown>[]): RawConvo[] {
  return list.map((c) => {
    const mapping = (c.mapping && typeof c.mapping === 'object' ? c.mapping : {}) as Record<string, Record<string, unknown>>;
    const msgs = Object.values(mapping)
      .map((n) => n && (n.message as Record<string, unknown> | undefined))
      .filter((m): m is Record<string, unknown> => Boolean(m && m.author && m.content))
      .map((m) => {
        const content = m.content as Record<string, unknown>;
        const parts = Array.isArray(content.parts) ? content.parts : [];
        const text = parts.filter((p) => typeof p === 'string').join('\n').trim();
        return { role: (m.author as Record<string, unknown>).role, text: esc(text), t: Number(m.create_time || 0) };
      })
      .filter((m) => m.text && (m.role === 'user' || m.role === 'assistant'))
      .sort((a, b) => a.t - b.t);
    return {
      title: String(c.title || '(untitled)'),
      dateIso: c.create_time ? new Date(Number(c.create_time) * 1000).toISOString() : '',
      turns: msgs.map((m) => ({ who: (m.role === 'user' ? 'You' : 'Assistant') as RawTurn['who'], text: m.text })),
    };
  });
}

// ── classification ────────────────────────────────────────────────────────────
export function matchTerms(convo: RawConvo): string[] {
  const hay = (convo.title + '\n' + convo.turns.map((t) => t.text).join('\n')).toLowerCase();
  return VOCAB.filter((v) => hay.includes(v));
}

// ── planning ──────────────────────────────────────────────────────────────────
function uniquePath(takenPaths: Set<string>, dir: string, base: string): string {
  let name = base, i = 2;
  while (takenPaths.has(`${dir}/${name}.md`)) name = `${base} ${i++}`;
  const p = `${dir}/${name}.md`;
  takenPaths.add(p);
  return p;
}

export function planImport(convos: RawConvo[], source: 'anthropic' | 'openai', nowIso: string): ImportPlan {
  const takenPaths = new Set<string>();
  const archives: FileOut[] = [];
  const stubs: FileOut[] = [];
  const termCount = new Map<string, number>();
  const research: { title: string; date: string; terms: string[] }[] = [];

  for (const c of convos) {
    const archPath = uniquePath(takenPaths, `Private/Archive/${source}`, `${day(c.dateIso)} ${slugify(c.title, 60)}`);
    const fm = ['---', 'kind: archive', `source: ${source}`, `date: ${c.dateIso || 'unknown'}`, `messages: ${c.turns.length}`, '---', ''];
    const body = [`# ${c.title}`, ''];
    for (const t of c.turns) body.push(`## ${t.who}`, '', t.text, '');
    archives.push({ path: archPath, content: fm.concat(body).join('\n') });

    const terms = matchTerms(c);
    if (terms.length >= MIN_DISTINCT_TERMS) {
      const stubPath = uniquePath(takenPaths, 'Notes/Archive index', `${source} ${day(c.dateIso)} ${slugify(c.title, 48)}`);
      const sfm = ['---', 'kind: archive-index', `source: ${source}`, `date: ${c.dateIso || 'unknown'}`,
        `aliases: [${terms.slice(0, 6).join(', ')}]`, '---', ''];
      const sbody = [
        `# ${c.title}`, '',
        `A ${source} conversation from ${day(c.dateIso)} (${c.turns.length} messages).`, '',
        `**Topics matched:** ${terms.join(', ')}`, '',
        `**Full text:** \`${archPath}\` — in Private, open it in Obsidian yourself.`,
        'AIs cannot follow that pointer; that is the design.', '',
      ];
      stubs.push({ path: stubPath, content: sfm.concat(sbody).join('\n') });
      research.push({ title: c.title, date: day(c.dateIso), terms });
      for (const t of terms) termCount.set(t, (termCount.get(t) || 0) + 1);
    }
  }

  const forgotten = research
    .map((r) => ({ ...r, rare: r.terms.filter((t) => (termCount.get(t) || 0) <= 2) }))
    .filter((r) => r.rare.length > 0)
    .sort((a, b) => b.rare.length - a.rare.length)
    .slice(0, 30);

  const reportContent = [
    '---', 'kind: note', `date: ${day(nowIso)}`,
    'aliases: [import report, forgotten threads, archive]', '---', '',
    '# Import report', '',
    `Imported **${convos.length}** conversations into Private/Archive (unreadable by any AI).`,
    `Research-classified: **${stubs.length}** — each has an index stub in this folder`,
    '(title + topics only; no content).', '',
    '## Possibly forgotten threads', '',
    'Research conversations whose topics appear rarely across your whole history —',
    'one-off ideas you may never have gotten back to:', '',
    ...forgotten.map((f) => `- **${f.title}** (${source}, ${f.date}) — rare topics: ${f.rare.join(', ')}`),
    '', '_Generated inside Obsidian by Explicit Formula. Nothing left this machine._', '',
  ].join('\n');

  return {
    archives,
    stubs,
    report: { path: `Notes/Archive index/_Import report ${source} ${day(nowIso)}.md`, content: reportContent },
    counts: { total: convos.length, indexed: stubs.length, forgotten: forgotten.length },
  };
}
