/**
 * User-side intake — estimates a human user's RPCS-1 ReceiverProfile from a
 * short behavioral calibration, the mirror of computeReceiverProfile (which
 * estimates an *agent's* profile from its environment).
 *
 * Design rules (match the rest of core):
 *   - Deterministic, explainable lookups. No ML. Every output traces to a value here.
 *   - Behavioral forced-choice, NOT self-diagnosis. We place the user continuously
 *     on each of the five axes; we never ask for or assign a category label.
 *     (This is Paper 9's thesis: ASD / ADHD / AuDHD are different *regions* of the
 *     same continuous space, never three boxes.)
 *   - A quick intake is a NOISY PRIOR, refined online from interaction at a rate
 *     governed by the user's own UE (updateProfile).
 */

import type { ReceiverProfile } from './types.js';

export type PrimitiveKey = 'TI' | 'SG' | 'FT' | 'UE' | 'AR';

export interface IntakeOption {
  /** Stable id for the answer (e.g. 'a' | 'b' | 'c') */
  id: string;
  /** What the user sees */
  label: string;
  /** Anchor position on this item's primitive axis, [0,100] */
  anchor: number;
}

export interface IntakeItem {
  /** The single primitive this item calibrates */
  primitive: PrimitiveKey;
  /** Plain-language framing shown to the user */
  prompt: string;
  /** 2–4 behavioral options, each mapped to an axis anchor */
  options: IntakeOption[];
}

/** The five-item intake — one calibration item per receiver primitive. */
export const INTAKE_ITEMS: IntakeItem[] = [
  {
    primitive: 'TI', // Temporal Integration — how much context before the point
    prompt: 'When someone explains something to you, you’d rather they:',
    options: [
      { id: 'a', label: 'Give the bottom line first, details only if I ask', anchor: 20 },
      { id: 'b', label: 'A little setup, then the point', anchor: 50 },
      { id: 'c', label: 'Walk me through the full context so the conclusion lands', anchor: 80 },
    ],
  },
  {
    primitive: 'SG', // Signal Gain — emotional amplification / tone sensitivity
    prompt: 'A reply that lands well for you is:',
    options: [
      { id: 'a', label: 'Flat and factual — just the information', anchor: 25 },
      { id: 'b', label: 'Mostly factual, a little warmth', anchor: 50 },
      { id: 'c', label: 'Warm and expressive — I read a lot into tone', anchor: 80 },
    ],
  },
  {
    primitive: 'FT', // Filtering Threshold — explicitness needed / does subtext land
    prompt: 'Someone says “It’s cold in here.” You most naturally read that as:',
    options: [
      { id: 'a', label: 'A literal statement about the temperature', anchor: 80 },
      { id: 'b', label: 'Could be either — I’d check', anchor: 50 },
      { id: 'c', label: 'A hint to close the window / turn up the heat', anchor: 25 },
    ],
  },
  {
    primitive: 'UE', // Update Elasticity — willingness to revise
    prompt: 'When someone pushes back on what you said, you usually:',
    options: [
      { id: 'a', label: 'Want to hear it out and may change my mind', anchor: 75 },
      { id: 'b', label: 'Want my point acknowledged first, then I’ll weigh it', anchor: 50 },
      { id: 'c', label: 'Find sudden changes jarring — I prefer consistency', anchor: 25 },
    ],
  },
  {
    primitive: 'AR', // Ambiguity Resolution — commit vs surface options
    prompt: 'When your question has several possible answers, you’d rather the AI:',
    options: [
      { id: 'a', label: 'Pick the most likely one and just answer', anchor: 75 },
      { id: 'b', label: 'Give the top answer but note the alternatives', anchor: 50 },
      { id: 'c', label: 'Lay out the options and ask which I meant', anchor: 25 },
    ],
  },
];

/** A user's answers: primitive → chosen option id. Partial allowed (missing → neutral 50). */
export type IntakeAnswers = Partial<Record<PrimitiveKey, string>>;

const NEUTRAL = 50;

/** Score intake answers into a ReceiverProfile. Missing answers fall to a neutral prior. */
export function scoreIntake(answers: IntakeAnswers): ReceiverProfile {
  const pick = (key: PrimitiveKey): number => {
    const item = INTAKE_ITEMS.find((i) => i.primitive === key)!;
    const chosen = item.options.find((o) => o.id === answers[key]);
    return chosen ? chosen.anchor : NEUTRAL;
  };
  return { TI: pick('TI'), SG: pick('SG'), FT: pick('FT'), UE: pick('UE'), AR: pick('AR') };
}

// ─── Rendering directives: how the bridge shapes output to THIS user ──────────
// This is what plugs into the translate path. It REPLACES the old fixed `style`
// strings (technical/social/"neurodivergent"): a literal communicator simply has
// high FT → explicit-literal rendering, derived from their continuous vector.

export type StructureMode = 'bluf' | 'balanced' | 'context_first';
export type WarmthMode = 'minimal' | 'moderate' | 'warm';
export type ExplicitnessMode = 'explicit_literal' | 'moderate' | 'implication_ok';
export type RevisionMode = 'consistent' | 'balanced' | 'open_challenge';
export type AmbiguityMode = 'clarify' | 'commit_with_note' | 'commit';

export interface RenderingDirectives {
  structure: StructureMode;     // from TI
  warmth: WarmthMode;           // from SG
  explicitness: ExplicitnessMode; // from FT
  revision: RevisionMode;       // from UE
  ambiguity: AmbiguityMode;     // from AR
  /** One-line trace per directive, for the transparency card. */
  why: Record<keyof Omit<RenderingDirectives, 'why'>, string>;
}

const band = (v: number, lo: string, mid: string, hi: string) =>
  v < 40 ? lo : v > 60 ? hi : mid;

export function deriveRenderingDirectives(p: ReceiverProfile): RenderingDirectives {
  const structure = band(p.TI, 'bluf', 'balanced', 'context_first') as StructureMode;
  const warmth = band(p.SG, 'minimal', 'moderate', 'warm') as WarmthMode;
  // FT high = needs explicitness; FT low = subtext lands
  const explicitness = (p.FT > 60 ? 'explicit_literal' : p.FT < 40 ? 'implication_ok' : 'moderate') as ExplicitnessMode;
  const revision = band(p.UE, 'consistent', 'balanced', 'open_challenge') as RevisionMode;
  const ambiguity = (p.AR > 60 ? 'commit' : p.AR < 40 ? 'clarify' : 'commit_with_note') as AmbiguityMode;
  return {
    structure, warmth, explicitness, revision, ambiguity,
    why: {
      structure: `TI=${p.TI}: ${structure === 'bluf' ? 'lead with the conclusion' : structure === 'context_first' ? 'build context before the point' : 'brief setup then the point'}`,
      warmth: `SG=${p.SG}: ${warmth === 'warm' ? 'expressive, tone-rich' : warmth === 'minimal' ? 'flat and factual' : 'lightly warm'}`,
      explicitness: `FT=${p.FT}: ${explicitness === 'explicit_literal' ? 'state intent outright; avoid idiom/hints' : explicitness === 'implication_ok' ? 'implication and subtext are fine' : 'mostly explicit'}`,
      revision: `UE=${p.UE}: ${revision === 'open_challenge' ? 'pushback welcome; may reframe' : revision === 'consistent' ? 'stay consistent; flag any change gently' : 'balanced revision'}`,
      ambiguity: `AR=${p.AR}: ${ambiguity === 'commit' ? 'pick the best reading and answer' : ambiguity === 'clarify' ? 'surface options and ask' : 'answer but note alternatives'}`,
    },
  };
}

// ─── Transparency card (the user can see and edit this) ───────────────────────

export interface ProfileCard {
  profile: ReceiverProfile;
  directives: RenderingDirectives;
  summary: string;
}

export function buildProfileCard(profile: ReceiverProfile): ProfileCard {
  const d = deriveRenderingDirectives(profile);
  const summary = [
    `Your communication profile (editable):`,
    `• Pace (TI ${profile.TI}): ${d.why.structure.split(': ')[1]}`,
    `• Tone (SG ${profile.SG}): ${d.why.warmth.split(': ')[1]}`,
    `• Directness (FT ${profile.FT}): ${d.why.explicitness.split(': ')[1]}`,
    `• Flexibility (UE ${profile.UE}): ${d.why.revision.split(': ')[1]}`,
    `• Ambiguity (AR ${profile.AR}): ${d.why.ambiguity.split(': ')[1]}`,
  ].join('\n');
  return { profile, directives: d, summary };
}

// ─── Online refinement: quick intake = prior; interaction = evidence ──────────
// new = prior + rate * (observed - prior), rate from the user's own UE.
// Users who self-describe as more elastic let their profile move faster.

export function updateProfile(
  prior: ReceiverProfile,
  observed: Partial<ReceiverProfile>,
  opts: { gain?: number } = {},
): ReceiverProfile {
  const rate = Math.min(0.5, Math.max(0.02, (opts.gain ?? prior.UE / 100) * 0.3));
  const blend = (a: number, b?: number) =>
    b === undefined ? a : Math.min(100, Math.max(0, Math.round(a + rate * (b - a))));
  return {
    TI: blend(prior.TI, observed.TI),
    SG: blend(prior.SG, observed.SG),
    FT: blend(prior.FT, observed.FT),
    UE: blend(prior.UE, observed.UE),
    AR: blend(prior.AR, observed.AR),
  };
}

// ─── Self-vs-observed mirror ──────────────────────────────────────────────────
// The user SETS where they think they are (self-perception). The system TRACKS
// where their messages actually land (observed behavior). The gap is, in effect,
// the shape of their masking — how differently they judge themselves.

export interface ProfileDivergence {
  selfSet: ReceiverProfile;
  observed: ReceiverProfile;
  /** observed − selfSet, signed, per primitive */
  delta: ReceiverProfile;
  /** mean absolute gap across the five axes, [0,100] */
  magnitude: number;
  /** plain-language readings for axes where the gap is notable (|delta| ≥ threshold) */
  notes: string[];
}

const DIVERGENCE_PHRASING: Record<
  PrimitiveKey,
  { higher: string; lower: string }
> = {
  TI: {
    higher: 'You think you want the bottom line, but you actually give and seek more context than you realize.',
    lower: 'You see yourself as wanting full context, but in practice you get to the point faster than you think.',
  },
  SG: {
    higher: 'You see yourself as flat and factual, but you come across warmer and more expressive than you think.',
    lower: 'You think you’re expressive, but your messages read more neutral and flat than you realize.',
  },
  FT: {
    higher: 'You see yourself as reading between the lines, but your messages come across quite literal and explicit.',
    lower: 'You think you’re literal, but you actually lean on hints and implication more than you realize.',
  },
  UE: {
    higher: 'You see yourself as preferring consistency, but you actually update and shift more readily than you think.',
    lower: 'You think you’re open to changing your mind, but in practice you hold your position more firmly than you realize.',
  },
  AR: {
    higher: 'You think you want the options laid out, but you actually push to decide and commit more than you realize.',
    lower: 'You see yourself as decisive, but you actually surface alternatives and hedge more than you think.',
  },
};

export function profileDivergence(
  selfSet: ReceiverProfile,
  observed: ReceiverProfile,
  threshold = 20,
): ProfileDivergence {
  const keys: PrimitiveKey[] = ['TI', 'SG', 'FT', 'UE', 'AR'];
  const delta = {} as ReceiverProfile;
  const notes: string[] = [];
  let sumAbs = 0;
  for (const k of keys) {
    const d = observed[k] - selfSet[k];
    delta[k] = d;
    sumAbs += Math.abs(d);
    if (Math.abs(d) >= threshold) {
      notes.push(d > 0 ? DIVERGENCE_PHRASING[k].higher : DIVERGENCE_PHRASING[k].lower);
    }
  }
  return {
    selfSet,
    observed,
    delta,
    magnitude: Math.round(sumAbs / keys.length),
    notes,
  };
}
