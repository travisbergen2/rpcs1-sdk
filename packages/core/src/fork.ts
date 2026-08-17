/**
 * Fork View — receiver-side composition of the two fork engines.
 *
 * Answers "how could this message read?" for text the USER RECEIVED, and
 * hands back the two moves that answer a fork instead of collapsing it:
 * the ask-back question and the forked-answer scaffold.
 *
 * Division of labor (deliberate, calibrated):
 *   - mirror()  — the deterministic floor. Structural fork detectors with a
 *     silence contract (clean prompts stay silent) and character offsets.
 *   - interpret (model path only) — the branch grower: reading paraphrases
 *     and clarify questions proposed by the perception backend.
 *   - interpret (rules path) — EXCLUDED. Calibrated 2026-08-15 on the
 *     misread corpus: the rules path flagged 47/47 items including all 24
 *     non-event controls (a pronoun word-list has no discrimination on
 *     conversational text). A rules-path TranslationOutput contributes
 *     nothing here; mirror already provides the deterministic floor.
 *
 * Receiver framing: mirror's reading clarifiers are SENDER-framed ("To be
 * clear: I mean ..."), written to be appended to one's own prompt. This
 * module never reuses them receiver-side; the ask-back is composed from the
 * reading summaries instead ("Quick check — do you mean A, or B?").
 *
 * Pure composition — no I/O here. The web route runs interpret and passes
 * its output in; this function is deterministic given its inputs.
 */

import { mirror } from './mirror.js';
import type { AmbiguousSpan, ForkKind } from './mirror.js';
import type { TranslationOutput, RecoveredEntity } from './translator.js';

// ── Result contract ───────────────────────────────────────────────────────────

export interface ForkBranch {
  /** Stable id: "mirror:<kind>:<reading>" or "model:<n>" */
  id: string;
  /** Which engine proposed this reading */
  source: 'mirror' | 'model';
  /** Short human parse of the reading (receiver-framed) */
  summary: string;
  /** The reading spelled out, when the engine provides one (model paraphrase) */
  canonical: string | null;
  /**
   * One line the SENDER can append to lock this reading in ("To be clear:
   * ..."). Mirror branches carry their detector's clarifier; model branches
   * get a deterministic composition. Null only when nothing sensible exists.
   */
  clarifier: string | null;
  /** One-line cost-if-wrong, when derivable from the fork kind */
  consequence: string | null;
}

export type ForkViewStatus = 'forks' | 'referent' | 'clean';

export interface ForkViewResult {
  original: string;
  /**
   * forks    — >= 2 distinct readings; answer the fork, don't collapse it.
   * referent — one reading, but a pointer is unrecoverable from the words.
   * clean    — no fork detected by either engine.
   */
  status: ForkViewStatus;
  /** Distinct readings, deterministic floor first (>= 2 iff status 'forks') */
  branches: ForkBranch[];
  /** Offset-accurate fork spans from the deterministic detectors */
  spans: AmbiguousSpan[];
  /** "Quick check — do you mean A, or B?" (null when nothing to ask) */
  branch_question: string | null;
  /** "If you mean A: ... / If you mean B: ..." (null unless status 'forks') */
  forked_answer_scaffold: string | null;
  /** Engine clarify questions, usable verbatim as ask-backs */
  ask_backs: string[];
  /** 'mirror-only' or 'mirror+<interpret engine>' */
  engine: string;
  /** interpret's AR level when a model-backed interpret contributed */
  ar_level: string | null;
}

export interface ForkViewOptions {
  /** Cap on branches surfaced (default 4 — a fork card, not a listing) */
  maxBranches?: number;
  /**
   * Reading summaries the user has already rejected ("none of these").
   * Matching branches are excluded so a try-again never re-offers them.
   * The list is never exhaustive-proof: when nothing new remains, the UI
   * falls through to the gloss box.
   */
  rejected?: string[];
}

// ── Consequence templates (deterministic; no fake model authority) ────────────

const KIND_CONSEQUENCE: Record<ForkKind, string> = {
  compare_or_choose:
    'Answer the wrong one and you have either chosen for them or padded a choice they already made.',
  grouping_fork: 'The wrong grouping answers a different request.',
  scope_fork: 'The wrong scope answers a different request.',
  dangling_pronoun: 'You would be answering about the wrong thing entirely.',
  external_reference: 'You would be answering about the wrong thing entirely.',
  bare_object: 'You would be answering about the wrong thing entirely.',
  confusable_typo: 'Same words, different topic — the reply will not land.',
  polysemy_fork: 'Same word, different sense — the reply will not land.',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const READING_MAX = 90;

function truncateReading(s: string): string {
  const t = s.trim();
  return t.length <= READING_MAX ? t : `${t.slice(0, READING_MAX - 1).trimEnd()}…`;
}

/**
 * Same unresolved-referent rule the engine's own question logic uses:
 * a bracketed candidate is the convention for "a confident description of
 * an unknown is still an unknown"; low confidence is unresolved outright.
 */
function isUnresolvedEntity(e: RecoveredEntity): boolean {
  const c = e.candidate;
  const placeholder = typeof c?.text === 'string' && c.text.startsWith('[');
  const lowConfidence = typeof c?.confidence === 'number' && c.confidence < 0.75;
  return placeholder || lowConfidence;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildForkView(
  text: string,
  interpretOutput: TranslationOutput | null = null,
  options: ForkViewOptions = {},
): ForkViewResult {
  const original = text ?? '';
  const maxBranches = options.maxBranches ?? 4;

  const m = mirror(original);

  const branches: ForkBranch[] = [];
  const seen = new Set<string>(
    (options.rejected ?? [])
      .filter((r): r is string => typeof r === 'string')
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean),
  );

  // Deterministic floor: the primary span's readings (mirror's chip contract —
  // further spans resolve after the first is locked; all spans are still
  // returned offset-accurate in `spans` for underline UIs).
  if (!m.clean) {
    for (const r of m.readings) {
      const key = r.summary.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const kind = r.id.split(':')[0] as ForkKind;
      branches.push({
        id: `mirror:${r.id}`,
        source: 'mirror',
        summary: r.summary.trim(),
        canonical: null,
        clarifier: r.clarifier ?? null,
        consequence: KIND_CONSEQUENCE[kind] ?? null,
      });
      if (branches.length >= maxBranches) break;
    }
  }

  // Model contribution — engine-gated (see module header).
  const modelBacked =
    !!interpretOutput && !!interpretOutput.engine && interpretOutput.engine !== 'rules';

  if (modelBacked && Array.isArray(interpretOutput.reading_paraphrases)) {
    for (const p of interpretOutput.reading_paraphrases) {
      if (branches.length >= maxBranches) break;
      const s = (p ?? '').trim();
      const key = s.toLowerCase();
      if (!s || seen.has(key)) continue;
      seen.add(key);
      branches.push({
        id: `model:${branches.length + 1}`,
        source: 'model',
        summary: s,
        canonical: s,
        clarifier: `To be clear: I mean ${s.replace(/[.\s]+$/, '')}.`,
        consequence: null,
      });
    }
  }

  const askBacks = modelBacked
    ? (interpretOutput.clarifying_questions ?? []).slice(0, 2)
    : [];
  const unresolved = modelBacked
    ? (interpretOutput.recovered_entities ?? []).filter(isUnresolvedEntity)
    : [];

  let status: ForkViewStatus;
  if (branches.length >= 2) status = 'forks';
  else if (unresolved.length > 0) status = 'referent';
  else status = 'clean';

  const branch_question =
    branches.length >= 2
      ? `Quick check — do you mean "${truncateReading(branches[0].summary)}", or "${truncateReading(branches[1].summary)}"?`
      : (askBacks[0] ?? null);

  const forked_answer_scaffold =
    branches.length >= 2
      ? `If you mean "${truncateReading(branches[0].summary)}":\n\nIf you mean "${truncateReading(branches[1].summary)}":\n`
      : null;

  return {
    original,
    status,
    branches,
    spans: m.ambiguousSpans,
    branch_question,
    forked_answer_scaffold,
    ask_backs: askBacks,
    engine: modelBacked ? `mirror+${interpretOutput.engine}` : 'mirror-only',
    ar_level: modelBacked ? (interpretOutput.ar_level ?? null) : null,
  };
}
