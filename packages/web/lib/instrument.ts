/**
 * The instrument — pure logic behind the two-pane homepage.
 *
 * Left pane: the user's words, as typed. Right pane: what the model receives —
 * the message as it parses, plus the standing instruction built from five
 * dials. The dials ARE the receiver profile R̂: the five RPCS-1 primitives on
 * [0,100], the same object /calibrate writes and the Bridge return leg reads.
 *
 * Design rule (binding): every derived string in this module comes out of
 * @rpcs1/core's own functions — deriveRenderingDirectives →
 * directivesToInstructions for the instruction, mapToParameters and
 * evaluateRegime for the agent-side reading. The equation the page shows is
 * the equation that runs; tests/instrument.test.ts pins that equality and
 * checks every formula stated in `agent.lines` against core over a grid.
 *
 * No I/O here. Storage helpers are string ⇄ profile only; the component owns
 * localStorage (see lib/rhat-store.ts).
 */

import {
  deriveRenderingDirectives,
  directivesToInstructions,
  evaluateRegime,
  interpret,
  mapToParameters,
  type PlatformParameters,
  type PredictedRegime,
  type ReceiverProfile,
  type RenderingDirectives,
  type TranslationOutput,
} from '@rpcs1/core';

export type DialKey = keyof ReceiverProfile;

/** Canonical order — matches core's ReceiverProfile field order and the vector notation. */
export const DIAL_ORDER: DialKey[] = ['TI', 'SG', 'FT', 'UE', 'AR'];

/** Shared with /calibrate (writer) and components/ReturnPanel.tsx (reader). */
export const RHAT_STORAGE_KEY = 'rpcs1.rhat.v1';

/** Every dial at the midpoint: core's own neutral prior (intake.ts NEUTRAL = 50). */
export const NEUTRAL_PROFILE: ReceiverProfile = { TI: 50, SG: 50, FT: 50, UE: 50, AR: 50 };

export interface DialSpec {
  key: DialKey;
  /** Human-side name — the same words core's profile card uses (Pace/Tone/Directness/Flexibility/Ambiguity). */
  name: string;
  /** The scientific name — shown in the equation line and the info bubble, never as the slider's main label. */
  scientific: string;
  /** What moving this slider changes, one line. */
  gloss: string;
  /** End labels, low → high, in the direction core's band rule reads them. */
  low: string;
  high: string;
  /** The directive field this dial drives in core's deriveRenderingDirectives. */
  directive: keyof Omit<RenderingDirectives, 'why'>;
}

/**
 * One slider per receiver primitive. End labels follow core exactly:
 *   TI <40 bluf / >60 context_first · SG <40 minimal / >60 warm ·
 *   FT <40 implication_ok / >60 explicit_literal · UE <40 consistent / >60 open_challenge ·
 *   AR <40 clarify / >60 commit.
 */
export const DIALS: DialSpec[] = [
  {
    key: 'TI',
    name: 'Pace',
    scientific: 'Temporal Integration',
    gloss: 'How much setup you want before the point.',
    low: 'Bottom line first',
    high: 'Full context first',
    directive: 'structure',
  },
  {
    key: 'SG',
    name: 'Tone',
    scientific: 'Signal Gain',
    gloss: 'How much warmth you want in the answer.',
    low: 'Flat and factual',
    high: 'Warm and expressive',
    directive: 'warmth',
  },
  {
    key: 'FT',
    name: 'Directness',
    scientific: 'Filtering Threshold',
    gloss: 'Whether hints and subtext should be spelled out.',
    low: 'Hints are fine',
    high: 'Say it outright',
    directive: 'explicitness',
  },
  {
    key: 'UE',
    name: 'Flexibility',
    scientific: 'Update Elasticity',
    gloss: 'How freely the answer may push back or change course.',
    low: 'Stay consistent',
    high: 'Push back freely',
    directive: 'revision',
  },
  {
    key: 'AR',
    name: 'Ambiguity',
    scientific: 'Ambiguity Resolution',
    gloss: 'When your words could mean two things: ask you, or pick one.',
    low: 'Ask me',
    high: 'Pick one and answer',
    directive: 'ambiguity',
  },
];

// ─── Profile hygiene ──────────────────────────────────────────────────────────

const clamp100 = (n: number): number => Math.min(100, Math.max(0, Math.round(n)));

/**
 * Coerce anything into a valid profile. Missing or non-numeric dials fall to
 * the neutral 50; numbers are rounded and clamped to [0,100]. Key order is
 * always TI, SG, FT, UE, AR.
 */
export function clampProfile(input: unknown): ReceiverProfile {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out: ReceiverProfile = { ...NEUTRAL_PROFILE };
  for (const k of DIAL_ORDER) {
    const v = src[k];
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = clamp100(v);
  }
  return out;
}

/**
 * Parse the stored R̂ (the /calibrate format: JSON with all five numeric
 * keys). Returns null when absent, unparseable, or incomplete — the same
 * acceptance rule the Bridge return leg applies — so the caller keeps its
 * current state instead of silently resetting the dials.
 */
export function parseStoredProfile(raw: string | null | undefined): ReceiverProfile | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== 'object') return null;
    const rec = p as Record<string, unknown>;
    if (!DIAL_ORDER.every((k) => typeof rec[k] === 'number' && Number.isFinite(rec[k] as number))) return null;
    return clampProfile(rec);
  } catch {
    return null;
  }
}

/** Serialize for storage in the exact shape /calibrate writes and ReturnPanel accepts. */
export function serializeProfile(p: ReceiverProfile): string {
  return JSON.stringify(clampProfile(p));
}

export function profilesEqual(a: ReceiverProfile, b: ReceiverProfile): boolean {
  return DIAL_ORDER.every((k) => a[k] === b[k]);
}

// ─── The equation ─────────────────────────────────────────────────────────────

export type Band = 'low' | 'mid' | 'high';

/**
 * Core's band rule, restated for display only (deriveRenderingDirectives:
 * below 40 → low mode, above 60 → high mode, else mid). The directive text
 * itself is never derived here — it always comes from core.
 */
export function bandOf(v: number): Band {
  return v < 40 ? 'low' : v > 60 ? 'high' : 'mid';
}

export interface EquationTerm {
  key: DialKey;
  name: string;
  scientific: string;
  value: number;
  band: Band;
  /** The mode core selected for this dial, e.g. 'bluf' | 'balanced' | 'context_first'. */
  mode: string;
  /** Core's one-line trace for this dial, e.g. "TI=50: brief setup then the point". */
  why: string;
}

export interface AgentReading {
  /** mapToParameters(profile, AGENT_PLATFORM) — verbatim. */
  params: PlatformParameters;
  /** evaluateRegime(profile) — verbatim. */
  regime: PredictedRegime;
  /**
   * The formulas, with this profile's numbers substituted. Each line states
   * the rule AND the value core returned; the test suite checks the stated
   * rule reproduces core across the whole 0–100 range.
   */
  lines: string[];
}

export interface Equation {
  profile: ReceiverProfile;
  terms: EquationTerm[];
  /** Compact vector notation: R̂ = (TI 50, SG 50, FT 50, UE 50, AR 50) */
  vector: string;
  /**
   * The instruction paragraph the model receives — verbatim
   * directivesToInstructions(deriveRenderingDirectives(profile)), which is
   * exactly rewriteForProfile(...).rewrite_instructions in core.
   */
  instruction: string;
  /** The agent-side reading of the same five numbers (for "show the math"). */
  agent: AgentReading;
}

/**
 * The platform whose ranges the agent-side lines use. 'generic' in core:
 * temperature [0.0, 1.0], max_tokens [256, 4096], top_p supported.
 * (A chat app cannot take these from a prefilled message — the instruction
 * paragraph is what actually travels; these lines show the same dials as an
 * agent configuration would read them.)
 */
export const AGENT_PLATFORM = 'generic' as const;

export function buildEquation(input: ReceiverProfile): Equation {
  const profile = clampProfile(input);
  const d = deriveRenderingDirectives(profile);

  const terms: EquationTerm[] = DIALS.map((spec) => ({
    key: spec.key,
    name: spec.name,
    scientific: spec.scientific,
    value: profile[spec.key],
    band: bandOf(profile[spec.key]),
    mode: String(d[spec.directive]),
    why: d.why[spec.directive],
  }));

  const instruction = directivesToInstructions(d);
  // Parentheses, not ⟨⟩: the mathematical angle brackets render as boxes in
  // common fallback fonts (seen in the phone-width render check).
  const vector = `R̂ = (${DIAL_ORDER.map((k) => `${k} ${profile[k]}`).join(', ')})`;

  const params = mapToParameters(profile, AGENT_PLATFORM);
  const regime = evaluateRegime(profile);
  const { TI, SG } = profile;
  // ASCII-safe notation on purpose (no subscripts or logic glyphs): these
  // lines render in the monospace stack, whose glyph coverage varies.
  const lines = [
    `temperature = 1.0 - (SG/100) * (1.0 - 0.0) = 1.0 - ${SG}/100 = ${params.temperature}`,
    `top_p = 0.4 + 0.6 * (1 - SG/100) = ${params.top_p}`,
    `max_tokens = round256(256 + (TI/100) * (4096 - 256)) = round256(256 + ${TI}/100 * 3840) = ${params.max_tokens}`,
    `context = ${params.context_strategy}   [TI >= 65 -> long_window; TI >= 35 -> rolling_summary; else frequent_grounding]`,
    `tool use = ${params.tool_use_strategy}   [FT >= 65 -> explicit_confirmation; AR <= 35 -> cautious_chaining; AR >= 65 -> aggressive; else fail_fast]`,
    `retry = ${params.retry_strategy}   [UE >= 65 -> aggressive; UE >= 35 -> moderate; else minimal]`,
    `regime = ${regime}   [TI >= 65 and SG >= 55 -> near_oscillation; TI <= 35 and SG >= 65 -> near_overload; UE <= 35 and FT >= 65 -> near_freeze; else stable]`,
  ];

  return { profile, terms, vector, instruction, agent: { params, regime, lines } };
}

// ─── The payload: exactly what the hand-off sends ─────────────────────────────

export const PAYLOAD_HEADINGS = {
  instruction: 'How to answer me',
  message: 'My message',
} as const;

export interface PayloadOptions {
  /** Default true. When false, the message travels alone (the dials stay on this page). */
  includeInstruction?: boolean;
}

/**
 * The exact text handed to the user's own model app: the standing instruction
 * from the dials, then the message. What the right pane previews is this
 * string, byte for byte.
 */
export function buildPayload(text: string, profile: ReceiverProfile, opts: PayloadOptions = {}): string {
  const body = text.trim();
  if (opts.includeInstruction === false) return body;
  const { instruction } = buildEquation(profile);
  return `${PAYLOAD_HEADINGS.instruction}: ${instruction}\n\n${PAYLOAD_HEADINGS.message}:\n${body}`;
}

// ─── The hearing: how the message parses, given the dials ─────────────────────

/** The risk category core's interpret() defaults to; the face runs at this fixed setting. */
export const HEARING_RISK = 'advice' as const;

export interface Hearing {
  /**
   * The message with unresolved referents bracketed, from core's
   * canonical_translation. Equals the text when nothing is unresolved.
   */
  readsAs: string;
  /** Core's keyword intent guess (a guess — displayed as such). */
  intent: TranslationOutput['recovered_intent']['type'];
  /** Questions the model would need answered, given this profile. */
  wouldAsk: string[];
  /** True when core says the reading should be played back before acting. */
  playback: boolean;
  /** Core's commit-vs-clarify level, AR0–AR5. */
  arLevel: TranslationOutput['ar_level'];
}

export function hear(text: string, profile: ReceiverProfile): Hearing | null {
  if (!text.trim()) return null;
  const out = interpret(text, HEARING_RISK, clampProfile(profile));
  return {
    readsAs: out.canonical_translation,
    intent: out.recovered_intent.type,
    wouldAsk: out.clarifying_questions,
    playback: out.playback_required,
    arLevel: out.ar_level,
  };
}
