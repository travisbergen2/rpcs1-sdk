/**
 * Interpretation Mirror — deterministic fork detectors.
 *
 * Shows the sender what their prompt actually says BEFORE it is sent: if the
 * text genuinely forks into more than one reading, every fork is surfaced with
 * its position, the readings it supports, and a one-line clarifier the UI can
 * append to lock a reading in.
 *
 * Design rules (match the rest of core):
 *   - Deterministic and explainable. No ML, no API calls. Every span traces to
 *     a named detector in this file; identical input → identical output.
 *   - SILENT ON CLEAN PROMPTS. A strip that always talks gets ignored. The
 *     zero-fork controls in tests/mirror.test.ts enforce this contract.
 *   - Contract-first: pure function of the text. No web-app, DOM, or session
 *     assumptions — callable identically from the web box, NL2Build, or any
 *     other front end.
 *   - Honest scope: these detectors catch STRUCTURAL forks (reference,
 *     scope, grouping, comparison-vs-choice). They do not claim to catch
 *     semantic ambiguity in general; an optional LLM-assist layer may add
 *     readings later, clearly labeled as such.
 */

// ─── Result contract ──────────────────────────────────────────────────────────

export type ForkKind =
  | 'dangling_pronoun'   // sentence-initial it/this/that/they with no antecedent in the prompt
  | 'external_reference' // "the above", "as discussed", "like before" — points outside the prompt
  | 'compare_or_choose'  // "X or Y" / "X vs Y" question without an explicit compare/choose verb
  | 'scope_fork'         // "only/just/all/also" whose scope forks across a coordination
  | 'grouping_fork'      // "A and B or C" — grouping is unparenthesized
  | 'bare_object';       // imperative verb whose only object is a pronoun

export interface ForkReading {
  /** Stable id within the span, e.g. 'a' | 'b' */
  id: string;
  /** Short human parse of this reading */
  summary: string;
  /** One sentence the UI can append to the prompt to lock this reading in */
  clarifier: string;
}

export interface AmbiguousSpan {
  /** Character offsets into the original text, [start, end) */
  start: number;
  end: number;
  /** The exact text of the span */
  text: string;
  kind: ForkKind;
  /** Plain-language reason this span forks */
  why: string;
  /** The distinct readings this span supports (>= 2 by construction) */
  readings: ForkReading[];
}

export interface MirrorResult {
  /** The text that was analyzed (echoed for contract stability) */
  text: string;
  /** True iff no fork was detected — the strip stays silent */
  clean: boolean;
  /** Every detected fork, in document order */
  ambiguousSpans: AmbiguousSpan[];
  /**
   * Prompt-level readings. When clean, a single 'as written' entry. When
   * forked, one entry per reading of the FIRST (highest-priority) span —
   * chips render these; further spans resolve after the first is locked.
   */
  readings: Array<{ id: string; summary: string; clarifier: string | null }>;
}

// ─── Detector helpers ─────────────────────────────────────────────────────────

interface Sentence {
  text: string;
  start: number; // offset of sentence start in the full text
}

/** Minimal sentence splitter — offsets preserved, no external deps. */
function splitSentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  const re = /[^.!?\n]+[.!?]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (trimmed.length > 0) out.push({ text: trimmed, start: m.index + lead });
  }
  return out;
}

const span = (
  start: number,
  end: number,
  text: string,
  kind: ForkKind,
  why: string,
  readings: ForkReading[],
): AmbiguousSpan => ({ start, end, text, kind, why, readings });

// ─── Detectors (each: (text, sentences) → AmbiguousSpan[]) ────────────────────

/** D1 — sentence-initial pronoun with nothing before it to refer to. */
function detectDanglingPronoun(text: string, sentences: Sentence[]): AmbiguousSpan[] {
  if (sentences.length === 0) return [];
  const first = sentences[0];
  const m = /^(it|this|that|they|these|those)\b/i.exec(first.text);
  if (!m) return [];
  const w = m[0];
  return [
    span(first.start, first.start + w.length, w, 'dangling_pronoun',
      `"${w}" opens the prompt, but the prompt contains nothing for it to refer to — the model will guess a referent.`,
      [
        { id: 'a', summary: `"${w}" refers to something from an earlier conversation`, clarifier: 'For context, I am referring to: [describe it briefly].' },
        { id: 'b', summary: `"${w}" refers to content you meant to paste but did not`, clarifier: 'Here is the content I am referring to: [paste it].' },
      ]),
  ];
}

/** D2 — references that point outside the prompt. */
const EXTERNAL_REFS = /\b(the above|as discussed|as mentioned|like before|the previous one|same as last time)\b/gi;
function detectExternalReference(text: string): AmbiguousSpan[] {
  const out: AmbiguousSpan[] = [];
  let m: RegExpExecArray | null;
  EXTERNAL_REFS.lastIndex = 0;
  while ((m = EXTERNAL_REFS.exec(text)) !== null) {
    out.push(span(m.index, m.index + m[0].length, m[0], 'external_reference',
      `"${m[0]}" points at something outside this prompt — a fresh model session cannot see it.`,
      [
        { id: 'a', summary: 'The referenced content is included elsewhere in this prompt', clarifier: 'The reference is to the content included above in this same message.' },
        { id: 'b', summary: 'The referenced content lives in another conversation', clarifier: 'For context, the earlier material was: [summarize it].' },
      ]));
  }
  return out;
}

/**
 * D3 — "X or Y" / "X vs Y" inside a question with no explicit compare/choose
 * verb: the model must guess between a comparison and a selection.
 * (The canonical founding example for this module.)
 */
const COMPARE_VERBS = /\b(compare|comparison|versus analysis|pros and cons|differences?|choose|pick|select|recommend|which one|decide)\b/i;
function detectCompareOrChoose(text: string, sentences: Sentence[]): AmbiguousSpan[] {
  const out: AmbiguousSpan[] = [];
  for (const s of sentences) {
    const isQuestionish = /\?\s*$/.test(s.text) || /^(what|how|is|are|should|can|could|would|tell me about)\b/i.test(s.text);
    if (!isQuestionish) continue;
    if (COMPARE_VERBS.test(s.text)) continue; // intent is explicit — no fork
    const m = /\b([A-Za-z0-9._-]+(?:\s[A-Za-z0-9._-]+)?)\s+(or|vs\.?|versus)\s+([A-Za-z0-9._-]+(?:\s[A-Za-z0-9._-]+)?)/i.exec(s.text);
    if (!m) continue;
    const x = m[1], y = m[3];
    const start = s.start + m.index;
    out.push(span(start, start + m[0].length, m[0], 'compare_or_choose',
      `"${x} ${m[2]} ${y}" in a question can mean "compare them" or "pick one" — the model will choose for you.`,
      [
        { id: 'a', summary: `Compare ${x} and ${y}`, clarifier: `To be clear: I want a comparison of ${x} and ${y}, not a recommendation.` },
        { id: 'b', summary: `Pick one of ${x} / ${y} for me`, clarifier: `To be clear: I want you to pick between ${x} and ${y} and justify the choice.` },
      ]));
  }
  return out;
}

/** D4 — scope words whose reach forks across a later coordination. */
function detectScopeFork(text: string, sentences: Sentence[]): AmbiguousSpan[] {
  const out: AmbiguousSpan[] = [];
  for (const s of sentences) {
    const scopeM = /\b(only|just)\b/i.exec(s.text);
    if (!scopeM) continue;
    const rest = s.text.slice(scopeM.index + scopeM[0].length);
    const coordM = /\b(and|or)\b/i.exec(rest);
    if (!coordM) continue; // no coordination after the scope word — scope is unambiguous enough
    const start = s.start + scopeM.index;
    out.push(span(start, start + scopeM[0].length, scopeM[0], 'scope_fork',
      `"${scopeM[0]}" sits before an "${coordM[0]}" — it can scope over the first item or over the whole list.`,
      [
        { id: 'a', summary: `"${scopeM[0]}" applies to the first item only`, clarifier: `To be clear: "${scopeM[0]}" applies to the first item, the rest is unrestricted.` },
        { id: 'b', summary: `"${scopeM[0]}" applies to the whole list`, clarifier: `To be clear: "${scopeM[0]}" applies to everything listed.` },
      ]));
  }
  return out;
}

/** D5 — unparenthesized "A and B or C" / "A or B and C" grouping. */
function detectGroupingFork(text: string, sentences: Sentence[]): AmbiguousSpan[] {
  const out: AmbiguousSpan[] = [];
  for (const s of sentences) {
    const m = /\b(\w[\w-]*)\s+(and|or)\s+(\w[\w-]*)\s+(and|or)\s+(\w[\w-]*)\b/i.exec(s.text);
    if (!m) continue;
    if (m[2].toLowerCase() === m[4].toLowerCase()) continue; // pure list "A and B and C" — no grouping fork
    const start = s.start + m.index;
    const [a, c1, b, c2, c] = [m[1], m[2], m[3], m[4], m[5]];
    out.push(span(start, start + m[0].length, m[0], 'grouping_fork',
      `"${a} ${c1} ${b} ${c2} ${c}" has two groupings and no parentheses — the model will pick one.`,
      [
        { id: 'a', summary: `(${a} ${c1} ${b}) ${c2} ${c}`, clarifier: `To be clear: I mean (${a} ${c1} ${b}) ${c2} ${c}.` },
        { id: 'b', summary: `${a} ${c1} (${b} ${c2} ${c})`, clarifier: `To be clear: I mean ${a} ${c1} (${b} ${c2} ${c}).` },
      ]));
  }
  return out;
}

/** D6 — imperative verb whose only object is a pronoun ("fix it", "improve this"). */
const IMPERATIVES = /\b(fix|improve|summarize|rewrite|refactor|shorten|expand|translate|clean up|debug|optimize)\s+(it|this|that|them)\b/gi;
function detectBareObject(text: string): AmbiguousSpan[] {
  const out: AmbiguousSpan[] = [];
  let m: RegExpExecArray | null;
  IMPERATIVES.lastIndex = 0;
  while ((m = IMPERATIVES.exec(text)) !== null) {
    // Only a fork if the prompt is short enough that "it" has no plausible in-prompt referent.
    const before = text.slice(0, m.index).trim();
    if (before.length > 80) continue; // long preamble likely contains the referent
    out.push(span(m.index, m.index + m[0].length, m[0], 'bare_object',
      `"${m[0]}" — the prompt does not contain the thing to ${m[0].split(/\s+/)[0].toLowerCase()}.`,
      [
        { id: 'a', summary: 'The target content should be pasted into this prompt', clarifier: 'Here is the content to work on: [paste it].' },
        { id: 'b', summary: 'The target is from an earlier conversation the model may not have', clarifier: 'The target is: [describe it briefly].' },
      ]));
  }
  return out;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Detector priority for the prompt-level chip readings (highest first). */
const DETECTOR_ORDER: ForkKind[] = [
  'compare_or_choose',
  'grouping_fork',
  'scope_fork',
  'dangling_pronoun',
  'bare_object',
  'external_reference',
];

/**
 * Analyze a prompt for structural forks.
 *
 * Pure, deterministic, no I/O. Returns clean=true (and a single 'as written'
 * reading) when no detector fires — the UI contract is that the strip renders
 * NOTHING in that case.
 */
export function mirror(text: string): MirrorResult {
  const trimmed = text ?? '';
  if (trimmed.trim().length === 0) {
    return { text: trimmed, clean: true, ambiguousSpans: [], readings: [{ id: 'as_written', summary: 'As written', clarifier: null }] };
  }
  const sentences = splitSentences(trimmed);

  const spans: AmbiguousSpan[] = [
    ...detectDanglingPronoun(trimmed, sentences),
    ...detectExternalReference(trimmed),
    ...detectCompareOrChoose(trimmed, sentences),
    ...detectScopeFork(trimmed, sentences),
    ...detectGroupingFork(trimmed, sentences),
    ...detectBareObject(trimmed),
  ].sort((a, b) => a.start - b.start);

  if (spans.length === 0) {
    return { text: trimmed, clean: true, ambiguousSpans: [], readings: [{ id: 'as_written', summary: 'As written', clarifier: null }] };
  }

  const primary = [...spans].sort(
    (a, b) => DETECTOR_ORDER.indexOf(a.kind) - DETECTOR_ORDER.indexOf(b.kind),
  )[0];

  return {
    text: trimmed,
    clean: false,
    ambiguousSpans: spans,
    readings: primary.readings.map((r) => ({ id: `${primary.kind}:${r.id}`, summary: r.summary, clarifier: r.clarifier })),
  };
}

/** Apply a chosen reading: append its clarifier so the locked reading travels with the prompt. */
export function applyReading(text: string, clarifier: string): string {
  const base = text.trimEnd();
  return clarifier ? `${base}\n\n${clarifier}` : base;
}
