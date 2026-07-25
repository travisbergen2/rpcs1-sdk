/**
 * Receiver personas — how each model app tends to READ a prompt, presented as
 * a character the user picks. The persona card is SendRight's routing surface:
 * "this reading, handled by the receiver that reads it best."
 *
 * CLAIM DISCIPLINE (binding — see One-Box spec, claim-ledger rule):
 *   - Every card carries a grade: 'measured' (backed by a frozen, versioned
 *     battery run, with date and tested version) or 'provisional' (sourced from
 *     vendor positioning + community-documented behavior; clearly badged).
 *     There is NO third state. v1 ships all-provisional.
 *   - Stat cells hold a number ONLY with a source and an as-of date. Where
 *     nothing has been measured, the cell says so: value null renders as
 *     "not yet measured". An honest empty cell is a trust feature.
 *   - Trait vectors below are PROVISIONAL ESTIMATES used only to order the
 *     panel. They are not accuracy claims and must never be rendered as
 *     percentages or scores in the UI. The ranking's "why" text is generated
 *     from them and is itself provisional-graded.
 *   - Model apps churn. Each card carries `describes` (the app, not a frozen
 *     model version) until a measured battery run pins a version string.
 */

import type { VendorId } from './handoff.js';
import type { ForkKind } from './mirror.js';

export type PersonaGrade = 'measured' | 'provisional';

export interface PersonaStat {
  label: string;
  /** null = not yet measured — the UI must render the honest empty cell */
  value: number | null;
  /** Required when value is non-null: who measured it and where */
  source: string | null;
  /** Required when value is non-null: ISO date of measurement */
  asOf: string | null;
}

/**
 * Provisional trait estimates on [0,100], used ONLY for deterministic panel
 * ordering. Not user-facing numbers.
 */
export interface TraitVector {
  /** Follows stated instructions tightly vs. improvises around them */
  literal: number;
  /** Hedges / caveats vs. commits to an answer */
  cautious: number;
  /** Terse vs. expansive output posture */
  concise: number;
  /** Cites / grounds in sources vs. answers from the model alone */
  sourced: number;
}

export interface PersonaCard {
  vendor: VendorId;
  /** Character title, e.g. "The Careful Reader" */
  title: string;
  /** Two-line read-style blurb — how this receiver tends to read a prompt */
  blurb: string;
  grade: PersonaGrade;
  /** What the card describes (app-level until a measured run pins a version) */
  describes: string;
  /** Where the provisional characterization comes from */
  sourceNote: string;
  traits: TraitVector;
  stats: PersonaStat[];
}

const NOT_YET_MEASURED: PersonaStat[] = [
  { label: 'Instruction fidelity', value: null, source: null, asOf: null },
  { label: 'Reading accuracy on forked prompts', value: null, source: null, asOf: null },
  { label: 'Clarifies before answering', value: null, source: null, asOf: null },
];

const PROVISIONAL_SOURCE =
  'Provisional: vendor positioning + community-documented behavior as of 2026-07-25. Not a measurement — a frozen battery run upgrades this card.';

export const PERSONAS: Record<VendorId, PersonaCard> = {
  claude: {
    vendor: 'claude', title: 'The Careful Reader',
    blurb: 'Reads instructions closely and takes qualifiers seriously. Tends to flag uncertainty rather than paper over it.',
    grade: 'provisional', describes: 'Claude (claude.ai app)', sourceNote: PROVISIONAL_SOURCE,
    traits: { literal: 78, cautious: 72, concise: 45, sourced: 40 },
    stats: NOT_YET_MEASURED,
  },
  chatgpt: {
    vendor: 'chatgpt', title: 'The Conversationalist',
    blurb: 'Fills gaps with sensible assumptions and keeps things moving. Comfortable committing to an answer from a loose brief.',
    grade: 'provisional', describes: 'ChatGPT (chatgpt.com app)', sourceNote: PROVISIONAL_SOURCE,
    traits: { literal: 55, cautious: 45, concise: 50, sourced: 40 },
    stats: NOT_YET_MEASURED,
  },
  perplexity: {
    vendor: 'perplexity', title: 'The Researcher',
    blurb: 'Treats your prompt like a research question and answers with sources. Note: tends to run the query immediately on hand-off.',
    grade: 'provisional', describes: 'Perplexity (perplexity.ai app)', sourceNote: PROVISIONAL_SOURCE,
    traits: { literal: 60, cautious: 50, concise: 55, sourced: 90 },
    stats: NOT_YET_MEASURED,
  },
  gemini: {
    vendor: 'gemini', title: 'The Explainer',
    blurb: 'Leans toward structured, tutorial-style answers with headers and steps. Generous with context around the answer.',
    grade: 'provisional', describes: 'Gemini (gemini.google.com app)', sourceNote: PROVISIONAL_SOURCE,
    traits: { literal: 55, cautious: 55, concise: 30, sourced: 55 },
    stats: NOT_YET_MEASURED,
  },
  grok: {
    vendor: 'grok', title: 'The Improviser',
    blurb: 'Casual register, opinionated, quick to commit. Least likely to ask before answering.',
    grade: 'provisional', describes: 'Grok (grok.com app)', sourceNote: PROVISIONAL_SOURCE,
    traits: { literal: 45, cautious: 25, concise: 55, sourced: 45 },
    stats: NOT_YET_MEASURED,
  },
  copilot: {
    vendor: 'copilot', title: 'The Summarizer',
    blurb: 'Work-context posture: short, safe, to the point. Prefers tidy summaries over long explorations.',
    grade: 'provisional', describes: 'Copilot (copilot.microsoft.com app)', sourceNote: PROVISIONAL_SOURCE,
    traits: { literal: 55, cautious: 65, concise: 80, sourced: 50 },
    stats: NOT_YET_MEASURED,
  },
};

// ─── Ranking (deterministic, documented, provisional-graded) ──────────────────

/**
 * Which receiver traits matter for a given fork kind, as weights over the
 * trait vector. Documented heuristic (see "why" strings): e.g. a prompt whose
 * fork was a missing referent is safest with receivers that read literally and
 * flag gaps, not ones that improvise a referent.
 */
const READING_WEIGHTS: Record<ForkKind | 'as_written', Partial<Record<keyof TraitVector, number>>> = {
  // Comparison-vs-choice got resolved by the clarifier; what matters now is
  // faithful execution of the locked reading.
  compare_or_choose: { literal: 2, sourced: 1 },
  // Grouping / scope clarifiers demand tight instruction-following.
  grouping_fork: { literal: 3 },
  scope_fork: { literal: 3 },
  // Missing-referent prompts are safest with receivers that won't invent one.
  dangling_pronoun: { literal: 2, cautious: 2 },
  bare_object: { literal: 2, cautious: 2 },
  external_reference: { literal: 2, cautious: 2 },
  // No fork detected: balanced default, slight tilt to instruction fidelity.
  as_written: { literal: 1, cautious: 1 },
};

export interface RankedPersona {
  card: PersonaCard;
  /** Internal ordering score — NOT user-facing */
  score: number;
  /** One-line provisional rationale for this position */
  why: string;
  grade: PersonaGrade;
}

export interface PanelResult {
  /** Top-N ranked cards (registered decision #4: N = 3) */
  top: RankedPersona[];
  /** The rest, in stable vendor order, explicitly unranked */
  unranked: PersonaCard[];
  /** Documented heuristic description for the "why this ranking?" reveal */
  heuristic: string;
}

const TRAIT_LABEL: Record<keyof TraitVector, string> = {
  literal: 'reads instructions tightly',
  cautious: 'flags gaps instead of improvising',
  concise: 'keeps it short',
  sourced: 'grounds answers in sources',
};

/**
 * Rank persona cards for a fork kind (or 'as_written' when the prompt is
 * clean). Deterministic: same input → same order. Ties break on stable vendor
 * order. Ranking grade is provisional until a registered routing-quality test
 * exists — the UI must badge it as such.
 */
export function rankPersonas(kind: ForkKind | 'as_written', topN = 3): PanelResult {
  const weights = READING_WEIGHTS[kind] ?? READING_WEIGHTS.as_written;
  const stableOrder: VendorId[] = ['chatgpt', 'claude', 'perplexity', 'grok', 'gemini', 'copilot'];

  const scored: RankedPersona[] = stableOrder.map((v) => {
    const card = PERSONAS[v];
    let score = 0;
    let topTrait: keyof TraitVector = 'literal';
    let topContribution = -1;
    for (const [trait, w] of Object.entries(weights) as Array<[keyof TraitVector, number]>) {
      const contribution = card.traits[trait] * w;
      score += contribution;
      if (contribution > topContribution) { topContribution = contribution; topTrait = trait; }
    }
    return {
      card,
      score,
      why: `${card.title} ${TRAIT_LABEL[topTrait]} — the trait this reading leans on most. (Provisional heuristic.)`,
      grade: 'provisional',
    };
  });

  scored.sort((a, b) => b.score - a.score || stableOrder.indexOf(a.card.vendor) - stableOrder.indexOf(b.card.vendor));

  const top = scored.slice(0, topN);
  const topVendors = new Set(top.map((r) => r.card.vendor));
  return {
    top,
    unranked: stableOrder.filter((v) => !topVendors.has(v)).map((v) => PERSONAS[v]),
    heuristic:
      'Ordering is a documented provisional heuristic: each fork type names the receiver traits it leans on (e.g. a missing referent favors receivers that flag gaps rather than improvise), and cards are ordered by those trait estimates. Trait estimates come from vendor positioning and community-documented behavior, not measurement. A frozen battery run upgrades cards to "measured" — until then, treat the order as a starting point, not a verdict.',
  };
}
