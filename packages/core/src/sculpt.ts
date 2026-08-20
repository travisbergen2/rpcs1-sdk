/**
 * Sculpt — whole-prompt guidance toward the reader's most comprehensible
 * form ("thesaurus in the chat box").
 *
 * Objective (SC-1 design doc): SELF-CONTAINEDNESS — move the meaning that
 * lives outside the string into the words. Not grammar policing, not a
 * single-parse goal: a stranger (human or model) holding none of the
 * sender's context should decompress the same reading every time.
 *
 * v0 is DETERMINISTIC (no model call): three change sources —
 *   1. substitutions: the SCULPT_SUBS lexicon (X→Y + reason; unvalidated-
 *      pending-divergence, see lexicon header);
 *   2. pointers: mirror's reference-class spans become [fill-in] prompts
 *      (only the sender can name what "that thing" is);
 *   3. asks: 2+ asks get one append-only enumeration so none get dropped.
 *
 * Contract: accept/skip PER CHANGE, never auto-apply (the tool guides; the
 * sender owns the words). Preview shows bracket-holes honestly — sculpt
 * cannot invent the sender's referents, only mark where they're needed.
 * Parse-choice forks (compare-vs-choose etc.) stay the fork picker's job.
 */

import { mirror } from './mirror.js';
import { SCULPT_SUBS } from './sculpt-lexicon.js';
import { analyzeSprawl } from './sprawl.js';

export interface SculptSpan {
  start: number;
  end: number;
  text: string;
}

export interface SculptChange {
  id: string;
  kind: 'substitution' | 'pointer' | 'asks';
  apply: 'replace' | 'append';
  /** Replace target in the original (null for appends) */
  span: SculptSpan | null;
  /** What is there now (display) */
  x: string;
  /** Proposed text; [bracketed holes] mark sender-only fills */
  y: string;
  /** Receiver-framed, blameless because-line */
  reason: string;
}

export interface SculptResult {
  original: string;
  changes: SculptChange[];
  /** All changes applied (holes visible) — a preview, never an auto-apply */
  sculpted_preview: string;
  ask_count: number;
  /** preview length / original length — the length guard, always reported */
  length_ratio: number;
  engine: 'sculpt-rules';
  contract: 'accept-skip-per-change';
}

const POINTER_KINDS = new Set(['dangling_pronoun', 'external_reference', 'bare_object']);

const POINTER_HOLE: Record<string, string> = {
  dangling_pronoun: '[what does this refer to?]',
  external_reference: '[paste or name the earlier thing]',
  bare_object: '[name the thing]',
};

/** Crude ask-sentence extractor (sentence-level; mirrors sprawl's granularity). */
function askSentences(text: string): string[] {
  const out: string[] = [];
  const re = /[^.!?\n]+[.!?]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const s = m[0].trim();
    if (!s) continue;
    if (/\?\s*$/.test(s) || /^(please|can you|could you|would you|will you|do you|did you|are you|is there|let me know|send|tell me|what|when|where|who|how|why|which)\b/i.test(s)) {
      out.push(s.replace(/\s+/g, ' '));
    }
  }
  return out;
}

export function buildSculpt(text: string): SculptResult {
  const original = text ?? '';
  const changes: SculptChange[] = [];
  const taken: Array<[number, number]> = [];

  const overlaps = (a: number, b: number) => taken.some(([s, e]) => a < e && b > s);

  // 1) Lexicon substitutions (first match per entry; offsets recorded).
  for (const sub of SCULPT_SUBS) {
    const re = new RegExp(sub.pattern, 'i');
    const m = re.exec(original);
    if (!m) continue;
    const start = m.index;
    const end = start + m[0].length;
    if (overlaps(start, end)) continue;
    taken.push([start, end]);
    const y = m.length > 1 && m[1] !== undefined ? sub.y.replace('$1', m[1]) : sub.y;
    changes.push({
      id: sub.id,
      kind: 'substitution',
      apply: 'replace',
      span: { start, end, text: m[0] },
      x: m[0],
      y,
      reason: sub.reason,
    });
  }

  // 2) Pointer holes from mirror's reference-class spans.
  const mir = mirror(original);
  for (const sp of mir.ambiguousSpans) {
    if (!POINTER_KINDS.has(sp.kind)) continue;
    if (overlaps(sp.start, sp.end)) continue;
    taken.push([sp.start, sp.end]);
    changes.push({
      id: `pointer:${sp.kind}:${sp.start}`,
      kind: 'pointer',
      apply: 'replace',
      span: { start: sp.start, end: sp.end, text: sp.text },
      x: sp.text,
      y: `${sp.text} ${POINTER_HOLE[sp.kind]}`,
      reason: sp.why,
    });
  }

  // 3) Multi-ask enumeration (append-only; none of the asks get dropped).
  const sprawl = analyzeSprawl(original);
  const asks = askSentences(original);
  if (sprawl.totalAsks >= 2 && asks.length >= 2) {
    const listed = asks.slice(0, 4).map((a, i) => `${i + 1}) ${a}`).join('\n');
    changes.push({
      id: 'asks:enumerate',
      kind: 'asks',
      apply: 'append',
      span: null,
      x: `${sprawl.totalAsks} asks in one message`,
      y: `\n\nSo nothing gets missed, I'm asking:\n${listed}`,
      reason: 'Readers usually answer the first ask and drop the rest; a numbered list makes each one answerable.',
    });
  }

  // Preview: apply replaces right-to-left, then appends.
  let preview = original;
  const replaces = changes
    .filter((c) => c.apply === 'replace' && c.span)
    .sort((a, b) => b.span!.start - a.span!.start);
  for (const c of replaces) {
    preview = preview.slice(0, c.span!.start) + c.y + preview.slice(c.span!.end);
  }
  for (const c of changes) {
    if (c.apply === 'append') preview += c.y;
  }

  return {
    original,
    changes,
    sculpted_preview: preview,
    ask_count: sprawl.totalAsks,
    length_ratio: original.length ? Math.round((preview.length / original.length) * 100) / 100 : 1,
    engine: 'sculpt-rules',
    contract: 'accept-skip-per-change',
  };
}
