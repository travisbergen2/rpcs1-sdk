/**
 * Sprawl analysis — discourse-level reading of a prompt: how many asks it
 * carries, where the topic shifts, where the speaker's perspective flips, and
 * where stated constraints contradict or interfere with each other.
 *
 * Complements mirror.ts: the mirror catches within-sentence structural forks
 * (trees); this module reads the whole prompt (forest).
 *
 * Design rules (same contract as mirror.ts):
 *   - Deterministic, explainable, no ML, no I/O. Identical input → identical
 *     output. Every finding traces to a named mechanism in this file.
 *   - Silent on compact single-ask prompts — `sprawling` gates the UI.
 *   - Honest scope: ask counts, segment boundaries, frame flips, and lexicon
 *     conflicts are demonstrated mechanisms. Segment MEANING (one-line
 *     summaries) and deep semantic contradiction are NOT claimed — that is the
 *     labeled LLM-assist tier.
 *
 * Segmentation follows the lexical-cohesion approach of TextTiling
 * (Hearst, 1997): topic boundaries fall where adjacent sentence windows stop
 * sharing vocabulary. This is the standard credited algorithm for the job,
 * reduced to its arithmetic core (no smoothing passes).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SprawlSegment {
  /** Character offsets into the original text, [start, end) */
  start: number;
  end: number;
  text: string;
  /** Number of distinct asks (questions/imperatives) inside this segment */
  asks: number;
  /** First few words, for outline row display */
  label: string;
}

export type Frame = 'first_person' | 'second_person' | 'third_party';

export interface PerspectiveFlip {
  /** Index of the sentence where the new frame begins */
  sentenceIndex: number;
  from: Frame;
  to: Frame;
  /** Offsets of the sentence where the flip lands */
  start: number;
  end: number;
  why: string;
}

export interface Conflict {
  kind: 'style_axis' | 'negation';
  /** The two clashing spans */
  aStart: number; aEnd: number; aText: string;
  bStart: number; bEnd: number; bText: string;
  why: string;
}

export interface SprawlResult {
  text: string;
  /** Total asks across the prompt */
  totalAsks: number;
  segments: SprawlSegment[];
  flips: PerspectiveFlip[];
  conflicts: Conflict[];
  /** Gate for the outline UI: true when the prompt warrants the strip */
  sprawling: boolean;
}

// ─── Sentence machinery (offset-preserving, no deps) ─────────────────────────

interface Sent { text: string; start: number; end: number }

function sentences(text: string): Sent[] {
  const out: Sent[] = [];
  const re = /[^.!?\n]+[.!?]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (trimmed.length > 0) out.push({ text: trimmed, start: m.index + lead, end: m.index + lead + trimmed.length });
  }
  return out;
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'while', 'that', 'this', 'these', 'those',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'they', 'them', 'their', 'it', 'its', 'he', 'she', 'his', 'her',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'can', 'could', 'should', 'may', 'might', 'must', 'shall', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with',
  'about', 'into', 'through', 'so', 'also', 'just', 'like', 'as', 'from', 'not', 'no', 'there', 'here', 'what',
  'which', 'who', 'how', 'why', 'where', 'some', 'any', 'all', 'more', 'most', 'other', 'than', 'too', 'very',
  'because', 'able', 'get', 'got', 'make', 'made', 'want', 'need', 'know', 'think', 'see', 'way', 'thing', 'things',
]);

function contentWords(s: string): Set<string> {
  const words = s.toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g) ?? [];
  return new Set(words.filter((w) => !STOPWORDS.has(w)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

// ─── Ask counting ─────────────────────────────────────────────────────────────

const IMPERATIVE_LEAD =
  /^(please\s+)?(write|fix|make|create|build|list|explain|compare|summarize|add|remove|give|tell|show|help|translate|draft|plan|design|suggest|recommend|review|check|update|generate|find|describe|rewrite|improve|analyze|convert|implement|refactor|walk|start|stop|log|include|use|let)\b/i;
const ASK_LEAD = /^(can|could|would|will|should|is it possible|how (do|would|can|could)|what (about|if)|do you)\b/i;

function isAsk(s: string): boolean {
  return /\?\s*$/.test(s) || IMPERATIVE_LEAD.test(s) || ASK_LEAD.test(s);
}

// ─── Topic segmentation (TextTiling-reduced) ──────────────────────────────────

const WINDOW = 2;           // sentences per comparison block
const MIN_SEG_SENTENCES = 2; // minimum sentences per segment
const VALLEY_SLACK = 0.4;    // boundary when cohesion < mean − slack·std

function segment(text: string, sents: Sent[]): SprawlSegment[] {
  if (sents.length < 2 * MIN_SEG_SENTENCES) {
    return sents.length === 0 ? [] : [toSegment(text, sents, 0, sents.length - 1)];
  }

  // Cohesion score at each gap between sentence i and i+1.
  const gaps: number[] = [];
  for (let i = 0; i < sents.length - 1; i++) {
    const left = sents.slice(Math.max(0, i - WINDOW + 1), i + 1).map((s) => s.text).join(' ');
    const right = sents.slice(i + 1, i + 1 + WINDOW).map((s) => s.text).join(' ');
    gaps.push(jaccard(contentWords(left), contentWords(right)));
  }

  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const std = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length);
  const threshold = mean - VALLEY_SLACK * std;

  // Boundaries at local minima below threshold, honoring min segment length.
  const boundaries: number[] = [];
  let lastBoundary = -1;
  for (let i = 0; i < gaps.length; i++) {
    const isValley =
      gaps[i] <= threshold &&
      (i === 0 || gaps[i] <= gaps[i - 1]) &&
      (i === gaps.length - 1 || gaps[i] <= gaps[i + 1]);
    const leftLen = i - lastBoundary;
    const rightLen = sents.length - 1 - i;
    if (isValley && leftLen >= MIN_SEG_SENTENCES && rightLen >= MIN_SEG_SENTENCES) {
      boundaries.push(i);
      lastBoundary = i;
    }
  }

  const segs: SprawlSegment[] = [];
  let startIdx = 0;
  for (const b of boundaries) {
    segs.push(toSegment(text, sents, startIdx, b));
    startIdx = b + 1;
  }
  segs.push(toSegment(text, sents, startIdx, sents.length - 1));
  return segs;
}

function toSegment(text: string, sents: Sent[], fromIdx: number, toIdx: number): SprawlSegment {
  const start = sents[fromIdx].start;
  const end = sents[toIdx].end;
  const segText = text.slice(start, end);
  const asks = sents.slice(fromIdx, toIdx + 1).filter((s) => isAsk(s.text)).length;
  const words = segText.split(/\s+/).slice(0, 6).join(' ');
  return { start, end, text: segText, asks, label: words + (segText.split(/\s+/).length > 6 ? '…' : '') };
}

// ─── Perspective-flip tracking (coarse, honestly labeled) ─────────────────────

const FIRST = /\b(i|i'm|i've|me|my|mine|we|we're|our)\b/gi;
const THIRD = /\b(the users?|users?|they|them|their|people|customers?|clients?|visitors?)\b/gi;

function dominantFrame(s: string): Frame | null {
  const first = (s.match(FIRST) ?? []).length;
  const third = (s.match(THIRD) ?? []).length;
  if (first === 0 && third === 0) return null;
  if (first > third) return 'first_person';
  if (third > first) return 'third_party';
  return null; // tie — no confident frame
}

function detectFlips(sents: Sent[]): PerspectiveFlip[] {
  const flips: PerspectiveFlip[] = [];
  let prev: Frame | null = null;
  for (let i = 0; i < sents.length; i++) {
    const f = dominantFrame(sents[i].text);
    if (f === null) continue;
    if (prev !== null && f !== prev) {
      flips.push({
        sentenceIndex: i,
        from: prev,
        to: f,
        start: sents[i].start,
        end: sents[i].end,
        why:
          prev === 'first_person'
            ? 'The prompt shifts from describing your own plan to describing what users/others do — a receiver can lose track of whose viewpoint the instructions are in.'
            : 'The prompt shifts back to first person — the receiver has to re-anchor whose viewpoint this is.',
      });
    }
    prev = f;
  }
  return flips;
}

// ─── Contradiction / interference detection (deterministic lexicon) ───────────

/** Opposing stated-constraint axes. Coverage is enumerable and documented. */
const STYLE_AXES: Array<{ axis: string; a: string[]; b: string[] }> = [
  {
    axis: 'length',
    a: ['short', 'brief', 'concise', 'quick summary', 'tl;dr', 'one paragraph', 'one line', 'few words'],
    b: ['detailed', 'comprehensive', 'thorough', 'in-depth', 'exhaustive', 'full detail', 'long-form', 'extensive'],
  },
  {
    axis: 'register',
    a: ['formal', 'professional'],
    b: ['casual', 'informal', 'conversational', 'playful', 'funny'],
  },
  {
    axis: 'complexity',
    a: ['simple', 'plain language', 'layman', 'beginner', 'eli5', 'non-technical'],
    b: ['technical', 'advanced', 'expert-level', 'rigorous', 'academic'],
  },
  {
    axis: 'creativity',
    a: ['stick to the facts', 'factual', 'literal', 'exact'],
    b: ['creative', 'imaginative', 'speculative'],
  },
];

const NEGATION_LEAD = /\b(no|don'?t(?:\s+\w+)?|do not(?:\s+\w+)?|without|avoid|never|skip)\s+([a-z][a-z0-9'-]{2,})/gi;
const NEGATION_REUSE_LEAD =
  /\b(use|using|include|including|add|adding|with|write|show|give)\s+(?:a\s+|the\s+|some\s+)?([a-z][a-z0-9'-]{2,})/gi;

function findAll(text: string, phrase: string): Array<{ start: number; end: number }> {
  const out: Array<{ start: number; end: number }> = [];
  const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push({ start: m.index, end: m.index + m[0].length });
  return out;
}

function detectConflicts(text: string): Conflict[] {
  const conflicts: Conflict[] = [];

  // 1. Opposing style axes both present.
  for (const { axis, a, b } of STYLE_AXES) {
    let aHit: { start: number; end: number } | null = null;
    let bHit: { start: number; end: number } | null = null;
    for (const p of a) { const h = findAll(text, p); if (h.length) { aHit = h[0]; break; } }
    for (const p of b) { const h = findAll(text, p); if (h.length) { bHit = h[0]; break; } }
    if (aHit && bHit) {
      conflicts.push({
        kind: 'style_axis',
        aStart: aHit.start, aEnd: aHit.end, aText: text.slice(aHit.start, aHit.end),
        bStart: bHit.start, bEnd: bHit.end, bText: text.slice(bHit.start, bHit.end),
        why: `These pull the ${axis} of the answer in opposite directions — the receiver will have to pick one and may not pick yours.`,
      });
    }
  }

  // 2. Negated term later re-requested ("don't use code ... include a code sample").
  const negated: Array<{ word: string; start: number; end: number }> = [];
  let m: RegExpExecArray | null;
  NEGATION_LEAD.lastIndex = 0;
  while ((m = NEGATION_LEAD.exec(text)) !== null) {
    negated.push({ word: m[2].toLowerCase(), start: m.index, end: m.index + m[0].length });
  }
  if (negated.length) {
    NEGATION_REUSE_LEAD.lastIndex = 0;
    while ((m = NEGATION_REUSE_LEAD.exec(text)) !== null) {
      const word = m[2].toLowerCase();
      const hit = negated.find((n) => n.word === word && m!.index > n.end);
      if (hit) {
        conflicts.push({
          kind: 'negation',
          aStart: hit.start, aEnd: hit.end, aText: text.slice(hit.start, hit.end),
          bStart: m.index, bEnd: m.index + m[0].length, bText: text.slice(m.index, m.index + m[0].length),
          why: `"${text.slice(hit.start, hit.end)}" rules out "${word}", but the prompt later asks for it — the receiver will silently obey one and ignore the other.`,
        });
      }
    }
  }

  return conflicts;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyze a prompt at discourse level. Pure and deterministic.
 *
 * `sprawling` gates the outline UI: true when the prompt carries 3+ asks,
 * splits into 2+ topic segments, flips perspective, or contradicts itself.
 * Compact single-ask prompts return sprawling=false — the strip stays silent.
 */
export function analyzeSprawl(text: string): SprawlResult {
  const t = text ?? '';
  const sents = sentences(t);
  const segments = segment(t, sents);
  const flips = detectFlips(sents);
  const conflicts = detectConflicts(t);
  const totalAsks = sents.filter((s) => isAsk(s.text)).length;

  const sprawling =
    totalAsks >= 3 || segments.length >= 2 || flips.length > 0 || conflicts.length > 0;

  return { text: t, totalAsks, segments, flips, conflicts, sprawling };
}
