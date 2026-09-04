/**
 * The instrument — pure logic behind the two-pane, two-board homepage.
 *
 * Left pane: YOUR board (five faders = your receiver profile R̂) above your
 * words. Right pane: THE MODEL'S board (the same five primitives read as an
 * agent configuration) above what the model receives. Both boards travel
 * with the message: yours as the instruction paragraph core derives for a
 * receiver like you, the model's as its operating stance plus the literal
 * settings line.
 *
 * Design rule (binding): every derived string here comes out of
 * @rpcs1/core's own functions — deriveRenderingDirectives →
 * directivesToInstructions for your board; mapToParameters and
 * evaluateRegime for the model's. The equations the page shows are the
 * equations that run; tests/instrument.test.ts pins those equalities and
 * checks every stated formula against core over the full 0–100 range.
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

/** Canonical order — matches core's ReceiverProfile field order and both vectors. */
export const DIAL_ORDER: DialKey[] = ['TI', 'SG', 'FT', 'UE', 'AR'];

/** YOUR board — shared with /calibrate (writer) and components/ReturnPanel.tsx (reader). */
export const RHAT_STORAGE_KEY = 'rpcs1.rhat.v1';

/** THE MODEL'S board — its own key; nothing else reads it yet. */
export const MODEL_RHAT_STORAGE_KEY = 'rpcs1.rhat.model.v1';

/** Every fader at the midpoint: core's own neutral prior (intake.ts NEUTRAL = 50) — the EQ's "flat" line. */
export const NEUTRAL_PROFILE: ReceiverProfile = { TI: 50, SG: 50, FT: 50, UE: 50, AR: 50 };

export interface DialSpec {
  key: DialKey;
  /** Channel name printed under the fader. */
  name: string;
  /** The scientific name — in the strip and the info bubble. */
  scientific: string;
  /** What moving this fader changes, one line. */
  gloss: string;
  /** End labels: what "down" and "up" mean on this channel, in the direction core reads them. */
  low: string;
  high: string;
}

export interface UserDialSpec extends DialSpec {
  /** The directive field this channel drives in core's deriveRenderingDirectives. */
  directive: keyof Omit<RenderingDirectives, 'why'>;
}

/**
 * YOUR board — the human-side names core's profile card uses. End labels follow core:
 *   TI <40 bluf / >60 context_first · SG <40 minimal / >60 warm ·
 *   FT <40 implication_ok / >60 explicit_literal · UE <40 consistent / >60 open_challenge ·
 *   AR <40 clarify / >60 commit.
 */
export const DIALS: UserDialSpec[] = [
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

/**
 * THE MODEL'S board — the same five primitives read as an agent configuration
 * (core's mapToParameters). End labels follow the mapping:
 *   TI → max_tokens and context strategy · SG → temperature (inverse) and top_p ·
 *   FT ≥ 65 → explicit confirmation before tool use · UE → retry strategy ·
 *   AR ≤ 35 cautious / ≥ 65 aggressive tool use.
 */
export const MODEL_DIALS: DialSpec[] = [
  {
    key: 'TI',
    name: 'Memory',
    scientific: 'Temporal Integration',
    gloss: 'How much history it holds and how long it may run.',
    low: 'Short memory, brief',
    high: 'Long memory, room to reason',
  },
  {
    key: 'SG',
    name: 'Gain',
    scientific: 'Signal Gain',
    gloss: 'How crisply it discriminates — sampling temperature runs inverse to it.',
    low: 'Exploratory (hot)',
    high: 'Crisp (cool)',
  },
  {
    key: 'FT',
    name: 'Trigger',
    scientific: 'Filtering Threshold',
    gloss: 'How sure it must be before it acts on a signal.',
    low: 'Acts on weak signals',
    high: 'Confirms before acting',
  },
  {
    key: 'UE',
    name: 'Agility',
    scientific: 'Update Elasticity',
    gloss: 'How readily it revises and retries.',
    low: 'Rarely retries',
    high: 'Retries aggressively',
  },
  {
    key: 'AR',
    name: 'Commit',
    scientific: 'Ambiguity Resolution',
    gloss: 'What it does when the request is unclear.',
    low: 'Cautious when unclear',
    high: 'Commits when unclear',
  },
];

// ─── Profile hygiene ──────────────────────────────────────────────────────────

const clamp100 = (n: number): number => Math.min(100, Math.max(0, Math.round(n)));

/**
 * Coerce anything into a valid profile. Missing or non-numeric channels fall
 * to the neutral 50; numbers are rounded and clamped to [0,100]. Key order is
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
 * Parse a stored profile (the /calibrate format: JSON with all five numeric
 * keys). Returns null when absent, unparseable, or incomplete — the same
 * acceptance rule the Bridge return leg applies — so the caller keeps its
 * current state instead of silently resetting a board.
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

function vectorOf(label: string, profile: ReceiverProfile): string {
  // Parentheses, not ⟨⟩: the mathematical angle brackets render as boxes in
  // common fallback fonts (seen in the phone-width render check).
  return `R̂(${label}) = (${DIAL_ORDER.map((k) => `${k} ${profile[k]}`).join(', ')})`;
}

// ─── YOUR board: the receiver equation ───────────────────────────────────────

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
  /** The mode core selected for this channel, e.g. 'bluf' | 'balanced' | 'context_first'. */
  mode: string;
  /** Core's one-line trace for this channel, e.g. "TI=50: brief setup then the point". */
  why: string;
}

export interface Equation {
  profile: ReceiverProfile;
  terms: EquationTerm[];
  /** R̂(you) = (TI 50, SG 50, FT 50, UE 50, AR 50) */
  vector: string;
  /**
   * The instruction paragraph the model receives — verbatim
   * directivesToInstructions(deriveRenderingDirectives(profile)), which is
   * exactly rewriteForProfile(...).rewrite_instructions in core.
   */
  instruction: string;
}

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
  return { profile, terms, vector: vectorOf('you', profile), instruction: directivesToInstructions(d) };
}

// ─── THE MODEL'S board: the agent equation ───────────────────────────────────

/**
 * The platform whose ranges the model board uses. 'generic' in core:
 * temperature [0.0, 1.0], max_tokens [256, 4096], top_p supported.
 */
export const AGENT_PLATFORM = 'generic' as const;

export interface ModelTerm {
  key: DialKey;
  name: string;
  scientific: string;
  value: number;
  /** One-line trace naming the setting(s) this channel drives, with core's values. */
  why: string;
}

export interface ModelEquation {
  profile: ReceiverProfile;
  terms: ModelTerm[];
  /** R̂(model) = (TI 50, SG 50, FT 50, UE 50, AR 50) */
  vector: string;
  /** mapToParameters(profile, AGENT_PLATFORM) — verbatim. */
  params: PlatformParameters;
  /** evaluateRegime(profile) — verbatim. */
  regime: PredictedRegime;
  /** The operating stance the model receives: core's system_prompt_additions, joined. */
  stance: string;
  /** The literal settings line — for apps that can apply numeric parameters. */
  settingsLine: string;
  /**
   * The formulas with this profile's numbers substituted. Each line states the
   * rule AND the value core returned; the tests check every stated rule
   * reproduces core across the whole 0–100 range. ASCII-safe on purpose.
   */
  lines: string[];
}

export function buildModelEquation(input: ReceiverProfile): ModelEquation {
  const profile = clampProfile(input);
  const params = mapToParameters(profile, AGENT_PLATFORM);
  const regime = evaluateRegime(profile);
  const { TI, SG, FT, UE, AR } = profile;

  const why: Record<DialKey, string> = {
    TI: `TI=${TI}: max_tokens ${params.max_tokens}, context ${params.context_strategy}`,
    SG: `SG=${SG}: temperature ${params.temperature}${params.top_p !== undefined ? `, top_p ${params.top_p}` : ''}`,
    FT: `FT=${FT}: ${FT >= 65 ? 'tool use gated behind explicit confirmation' : 'no confirmation gate; tool use follows AR'}`,
    UE: `UE=${UE}: retry ${params.retry_strategy}`,
    AR: `AR=${AR}: tool use ${params.tool_use_strategy}`,
  };

  const terms: ModelTerm[] = MODEL_DIALS.map((spec) => ({
    key: spec.key,
    name: spec.name,
    scientific: spec.scientific,
    value: profile[spec.key],
    why: why[spec.key],
  }));

  const stance = (params.system_prompt_additions ?? []).join(' ');
  const settingsLine =
    `temperature ${params.temperature}; top_p ${params.top_p}; max_tokens ${params.max_tokens}; ` +
    `context ${params.context_strategy}; tool use ${params.tool_use_strategy}; retry ${params.retry_strategy}`;

  const lines = [
    `temperature = 1.0 - (SG/100) * (1.0 - 0.0) = 1.0 - ${SG}/100 = ${params.temperature}`,
    `top_p = 0.4 + 0.6 * (1 - SG/100) = ${params.top_p}`,
    `max_tokens = round256(256 + (TI/100) * (4096 - 256)) = round256(256 + ${TI}/100 * 3840) = ${params.max_tokens}`,
    `context = ${params.context_strategy}   [TI >= 65 -> long_window; TI >= 35 -> rolling_summary; else frequent_grounding]`,
    `tool use = ${params.tool_use_strategy}   [FT >= 65 -> explicit_confirmation; AR <= 35 -> cautious_chaining; AR >= 65 -> aggressive; else fail_fast]`,
    `retry = ${params.retry_strategy}   [UE >= 65 -> aggressive; UE >= 35 -> moderate; else minimal]`,
    `regime = ${regime}   [TI >= 65 and SG >= 55 -> near_oscillation; TI <= 35 and SG >= 65 -> near_overload; UE <= 35 and FT >= 65 -> near_freeze; else stable]`,
    `stance = system prompt additions   [FT >= 60 -> high_stakes; TI <= 25 -> rapid_response; AR <= 35 -> ambiguity_caution; FT >= 75 -> high_filter; + translation posture]`,
  ];

  return { profile, terms, vector: vectorOf('model', profile), params, regime, stance, settingsLine, lines };
}

// ─── The payload: exactly what the hand-off sends ─────────────────────────────

export const PAYLOAD_HEADINGS = {
  instruction: 'How to answer me',
  stance: 'How to run',
  settings: 'Requested settings (apply where your app allows; otherwise ignore)',
  message: 'My message',
} as const;

export interface PayloadOptions {
  /** Default true. When false, the message travels alone (both boards stay on this page). */
  includeInstruction?: boolean;
}

/**
 * The exact text handed to the user's own model app: your board's standing
 * instruction, the model board's stance and literal settings, then the
 * message. What the right pane previews is this string, byte for byte.
 */
export function buildPayload(
  text: string,
  you: ReceiverProfile,
  model: ReceiverProfile,
  opts: PayloadOptions = {},
): string {
  const body = text.trim();
  if (opts.includeInstruction === false) return body;
  const yours = buildEquation(you);
  const theirs = buildModelEquation(model);
  return [
    `${PAYLOAD_HEADINGS.instruction}: ${yours.instruction}`,
    `${PAYLOAD_HEADINGS.stance}: ${theirs.stance}`,
    `${PAYLOAD_HEADINGS.settings}: ${theirs.settingsLine}`,
    `${PAYLOAD_HEADINGS.message}:\n${body}`,
  ].join('\n\n');
}

// ─── The hearing: how the message parses, given YOUR board ────────────────────

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
  /** Questions the model would need answered, given your board. */
  wouldAsk: string[];
  /** True when core says the reading should be played back before acting. */
  playback: boolean;
  /** Core's commit-vs-clarify level, AR0–AR5. */
  arLevel: TranslationOutput['ar_level'];
}

/** Core's interpret() modulates clarify-vs-commit by the USER's profile — so this takes your board. */
export function hear(text: string, you: ReceiverProfile): Hearing | null {
  if (!text.trim()) return null;
  const out = interpret(text, HEARING_RISK, clampProfile(you));
  return {
    readsAs: out.canonical_translation,
    intent: out.recovered_intent.type,
    wouldAsk: out.clarifying_questions,
    playback: out.playback_required,
    arLevel: out.ar_level,
  };
}
