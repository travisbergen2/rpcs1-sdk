/**
 * axes.ts — the Bridge's coordinate system (Full-Duplex Bridge spec v0.2, A1/A2).
 *
 * Intent is a POINT on continuous axes, never a category. The four launch axes
 * are exactly the E-RX-1 arm-B transformations — the directive bundle whose
 * registered payoff was 69% → 96% bare-output compliance (n=192, p<0.00001,
 * corroboration grade). Each transform here is DETERMINISTIC rule application:
 * no model call, no creativity, byte-reproducible. That is what licenses the
 * "measured" evidence tag on these four axes; any future axis added without a
 * registered test must carry evidence: 'unproven'.
 *
 * Do not add axes with evidence: 'measured' without a new registered test.
 */

export type AxisId = 'urgency' | 'register' | 'fencing' | 'commentary';

export interface AxisDef {
  id: AxisId;
  /** Plain-language name shown in UI (intuition-first; no mechanism names). */
  label: string;
  /** What the low end means, in the user's language. */
  lowLabel: string;
  /** What the high end means. */
  highLabel: string;
  /** Number of positions (slider detents). Position 0 is always identity. */
  positions: number;
  /** Evidence grade for this axis's effect on compliance. */
  evidence: 'measured' | 'unproven';
  /** Which E-RX-1 transformation this axis corresponds to. */
  source: string;
}

export const AXES: AxisDef[] = [
  {
    id: 'urgency',
    label: 'Deadline pressure',
    lowLabel: 'keep it',
    highLabel: 'strip it',
    positions: 3,
    evidence: 'measured',
    source: 'T-URG (E-RX-1)',
  },
  {
    id: 'register',
    label: 'Personal register',
    lowLabel: 'keep it',
    highLabel: 'strip it',
    positions: 3,
    evidence: 'measured',
    source: 'T-REG (E-RX-1)',
  },
  {
    id: 'fencing',
    label: 'Fence the rules',
    lowLabel: 'inline',
    highLabel: 'explicit block',
    positions: 2,
    evidence: 'measured',
    source: 'T-FENCE (E-RX-1)',
  },
  {
    id: 'commentary',
    label: 'Answer only',
    lowLabel: 'allow chat',
    highLabel: 'bare output',
    positions: 2,
    evidence: 'measured',
    source: 'T-NOC (E-RX-1)',
  },
];

/** A point in axis space. Each value in [0, positions). 0 = leave text as written. */
export type AxisCoords = Record<AxisId, number>;

export const IDENTITY_COORDS: AxisCoords = {
  urgency: 0,
  register: 0,
  fencing: 0,
  commentary: 0,
};

export interface AxisMove {
  axis: AxisId;
  /** Human-readable description of what the transform did. */
  note: string;
}

export interface ApplyResult {
  text: string;
  /** Empty when nothing changed (either coords were identity or nothing matched). */
  moves: AxisMove[];
}

// ── Deterministic clause machinery ───────────────────────────────────────────

/** Deadline / social-pressure phrases (clause-level match). */
const URGENCY_RE =
  /\b(asap|a\.s\.a\.p\.?|right now|immediately|urgent(?:ly)?|hurry|quick(?:ly)?|in \d+ ?(?:minutes?|mins?|hours?)|in (?:ten|five|thirty|an?) (?:minutes?|hours?)|by (?:tonight|tomorrow|end of (?:the )?day|eod)|(?:call|demo|meeting|vote)s? (?:start|begin)s? in|we'?re about to|before the (?:call|demo|meeting|board))\b/i;

/** Personal-state / emotional-register phrases. */
const REGISTER_RE =
  /\b(i'?ve had a (?:brutal|rough|long|terrible|hard) (?:week|day|month)|my head is (?:pounding|killing me)|i'?m (?:so |really |completely )?(?:tired|exhausted|stressed|frustrated|overwhelmed|desperate)|i'?m having a (?:bad|rough|terrible) (?:day|week)|sorry to bother you|forgive me,?)\b/i;

/** Output-constraint signals for fencing. */
const CONSTRAINT_RE =
  /\b(don'?t|do not|no more than|at most|at least|exactly|only|must(?:n'?t)? |never|avoid|without (?:mentioning|using)|one (?:word|sentence|line)|two sentences?|number only|numbers? only|valid json|as json|bullet points? only|keep it (?:brief|short))\b/i;

const NOC_SENTENCE = 'Output the requested text only, with no commentary.';

function splitSentences(text: string): string[] {
  // Conservative sentence split: keeps delimiters attached; never re-orders.
  const parts = text.match(/[^.!?\n]+[.!?]*\s*|\n+/g);
  return parts ?? [text];
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Remove clauses matching `re` from text.
 * strength 1 (soften): only strips exclamation marks and bare interjection
 *   clauses ("quick!", "hurry!") — the mildest measurable move.
 * strength 2 (strip): removes matching comma-clauses; drops whole sentences
 *   that are pressure-only (fewer than 3 words of residue after removal).
 * Deterministic; no replacement text is ever inserted (E-RX-1 rule).
 */
function stripClauses(text: string, re: RegExp, strength: number): { text: string; hits: number } {
  if (strength <= 0) return { text, hits: 0 };
  let hits = 0;

  if (strength === 1) {
    // Soften: drop "<match>!"-style interjections and de-escalate exclamations.
    const softened = text
      .replace(new RegExp(`(?:^|(?<=[.!?]\\s))${'('}${re.source}${')'}[!.]+\\s*`, 'gi'), () => {
        hits += 1;
        return '';
      })
      .replace(/!{2,}/g, '!');
    return { text: softened.trim(), hits };
  }

  // strength >= 2: clause/sentence removal.
  const sentences = splitSentences(text);
  const kept: string[] = [];
  for (const sentence of sentences) {
    if (!re.test(sentence)) {
      kept.push(sentence);
      continue;
    }
    // Remove matching comma-clauses inside the sentence.
    const clauses = sentence.split(/(,\s*| so | and )/);
    const keptClauses = clauses.filter((c, i) => {
      // keep separators attached to decisions of following clause; simple pass:
      if (i % 2 === 1) return true; // separator — resolved below
      const matches = re.test(c);
      if (matches) hits += 1;
      return !matches;
    });
    // Re-join and clean dangling separators.
    let rebuilt = keptClauses
      .join('')
      .replace(/(^|\s)(,\s*| so | and )+\s*(?=[A-Z0-9"']|$)/g, '$1')
      .replace(/^\s*(,\s*| so | and )/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    // Drop the sentence entirely if it was pressure-only.
    if (wordCount(rebuilt.replace(re, '')) < 3) rebuilt = '';
    if (rebuilt.length > 0) kept.push(rebuilt.endsWith(' ') ? rebuilt : rebuilt + ' ');
  }
  const out = kept.join('').replace(/\s{2,}/g, ' ').trim();
  return { text: out, hits };
}

/** Move detected output-constraints into an explicit leading block (T-FENCE). */
function fenceConstraints(text: string): { text: string; hits: number } {
  const sentences = splitSentences(text);
  const constraints: string[] = [];
  const task: string[] = [];
  for (const s of sentences) {
    if (CONSTRAINT_RE.test(s) && wordCount(s) <= 25) {
      constraints.push(s.trim().replace(/[.!?]+$/, ''));
    } else {
      task.push(s);
    }
  }
  if (constraints.length === 0) return { text, hits: 0 };
  const block =
    'Constraints (mandatory):\n' + constraints.map((c) => `- ${c}`).join('\n') + '\n\n';
  return { text: (block + task.join('').trim()).trim(), hits: constraints.length };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Apply an axis-coordinate move to a prompt. Pure and deterministic:
 * same (text, coords) always yields the same output. Identity coords
 * return the text byte-unchanged.
 */
export function applyAxes(text: string, coords: AxisCoords): ApplyResult {
  const moves: AxisMove[] = [];
  let out = text;

  if (coords.urgency > 0) {
    const r = stripClauses(out, URGENCY_RE, coords.urgency);
    if (r.hits > 0) {
      out = r.text;
      moves.push({
        axis: 'urgency',
        note:
          coords.urgency === 1
            ? `softened ${r.hits} pressure interjection${r.hits === 1 ? '' : 's'}`
            : `removed ${r.hits} deadline-pressure clause${r.hits === 1 ? '' : 's'}`,
      });
    }
  }

  if (coords.register > 0) {
    const r = stripClauses(out, REGISTER_RE, coords.register);
    if (r.hits > 0) {
      out = r.text;
      moves.push({
        axis: 'register',
        note: `removed ${r.hits} personal-register clause${r.hits === 1 ? '' : 's'}`,
      });
    }
  }

  if (coords.fencing > 0) {
    const r = fenceConstraints(out);
    if (r.hits > 0) {
      out = r.text;
      moves.push({
        axis: 'fencing',
        note: `moved ${r.hits} constraint${r.hits === 1 ? '' : 's'} into an explicit leading block`,
      });
    }
  }

  if (coords.commentary > 0 && !out.includes(NOC_SENTENCE)) {
    out = out.trim() + (out.trim().length > 0 ? '\n\n' : '') + NOC_SENTENCE;
    moves.push({ axis: 'commentary', note: 'appended the bare-output fence' });
  }

  return { text: out, moves };
}
