/**
 * Repaste receiver personas.
 *
 * Each persona is a ReceiverProfile preset presented as a character the user
 * can choose to "talk to". Picking a persona tunes the rewrite: the profile
 * vector flows into rewriteForProfile (@rpcs1/core), which derives rendering
 * directives deterministically. No user profiling anywhere in this flow.
 *
 * CLAIM DISCIPLINE (Paper 0B rule applied to product copy):
 * A persona card is a claim about how a class of receivers reads.
 * Exactly two grades exist:
 *   - "provisional": sketched from documented default behavior; NOT measured.
 *     Cards must show the provisional badge. `testedVersion` is null.
 *   - "measured": backed by a frozen, versioned battery run. `testedVersion`
 *     must carry the exact model+version string and `measuredDate` the run date.
 * There is no third state. Do not add a persona without a grade.
 *
 * `worksWellWith` lists model FAMILIES as provisional suggestions only —
 * it is a pointer, not a measured per-model claim.
 */
import type { ReceiverProfile } from '@rpcs1/core';

export type CardGrade = 'provisional' | 'measured';

export type AvatarMotif = 'rings' | 'grid' | 'weave' | 'facets' | 'bolt' | 'field';

export interface ReceiverPersona {
  id: string;
  /** Character title — the only name the surface shows. */
  title: string;
  /** Two lines, plain words: how this receiver reads what you paste. */
  tagline: string;
  /** RPCS-1 receiver vector, all values in [0, 100]. */
  profile: ReceiverProfile;
  grade: CardGrade;
  /** Exact model+version string once measured; null while provisional. */
  testedVersion: string | null;
  /** ISO date of the battery run once measured; null while provisional. */
  measuredDate: string | null;
  /** Provisional model-family suggestions. Pointers, not measurements. */
  worksWellWith: string[];
  /** Avatar accent hue (0-360). */
  hue: number;
  motif: AvatarMotif;
  /** One-click-deep description (mechanism layer). */
  details: string;
}

export const PERSONAS: ReceiverPersona[] = [
  {
    id: 'literal-reader',
    title: 'The Literal Reader',
    tagline: 'Takes every word at face value. Says so when something can be read two ways instead of guessing.',
    profile: { TI: 70, SG: 45, FT: 70, UE: 55, AR: 35 },
    grade: 'provisional',
    testedVersion: null,
    measuredDate: null,
    worksWellWith: ['Claude-family defaults'],
    hue: 205,
    motif: 'rings',
    details:
      'High filtering threshold and low ambiguity-resolution pressure: this receiver gates action conservatively and surfaces alternate readings rather than committing to one. Prompts aligned to it spell out intent literally and leave nothing to implication.',
  },
  {
    id: 'fast-committer',
    title: 'The Fast Committer',
    tagline: 'Picks the most likely meaning and runs with it. Great when you want an answer, not a question back.',
    profile: { TI: 55, SG: 60, FT: 40, UE: 60, AR: 85 },
    grade: 'provisional',
    testedVersion: null,
    measuredDate: null,
    worksWellWith: ['GPT-family defaults'],
    hue: 150,
    motif: 'bolt',
    details:
      'High ambiguity resolution with a low gate: this receiver commits to a reading quickly and fills gaps with plausible assumptions. Prompts aligned to it front-load the decision you want made so the commitment lands on your reading, not its guess.',
  },
  {
    id: 'context-weaver',
    title: 'The Context Weaver',
    tagline: 'Reads everything you give it and pulls the threads together. Feed it background; it will use all of it.',
    profile: { TI: 90, SG: 55, FT: 50, UE: 65, AR: 60 },
    grade: 'provisional',
    testedVersion: null,
    measuredDate: null,
    worksWellWith: ['Gemini-family defaults', 'long-context deployments'],
    hue: 265,
    motif: 'weave',
    details:
      'Very high temporal integration: this receiver weights long context heavily. Prompts aligned to it build context first and state the ask at the end, where the integration window lands.',
  },
  {
    id: 'skeptic',
    title: 'The Skeptic',
    tagline: 'Deliberates before answering and double-checks itself. Give it constraints and it will honor them.',
    profile: { TI: 75, SG: 40, FT: 85, UE: 45, AR: 50 },
    grade: 'provisional',
    testedVersion: null,
    measuredDate: null,
    worksWellWith: ['reasoning-tier models'],
    hue: 30,
    motif: 'facets',
    details:
      'Very high filtering threshold with low gain: this receiver acts only on well-supported signals. Prompts aligned to it state constraints and success criteria explicitly — it will use them as checks.',
  },
  {
    id: 'sprinter',
    title: 'The Sprinter',
    tagline: 'Quick and terse. Spell everything out — it will not stop to wonder what you meant.',
    profile: { TI: 30, SG: 70, FT: 45, UE: 40, AR: 75 },
    grade: 'provisional',
    testedVersion: null,
    measuredDate: null,
    worksWellWith: ['small / fast model tiers'],
    hue: 340,
    motif: 'grid',
    details:
      'Short integration window, high gain, high commitment: this receiver reacts to what is directly in front of it. Prompts aligned to it are short, fully explicit, and carry no long dependencies.',
  },
  {
    id: 'open-book',
    title: 'The Open Book',
    tagline: 'Behavior depends on where it is hosted. Maximum structure keeps it steady anywhere.',
    profile: { TI: 50, SG: 50, FT: 50, UE: 70, AR: 55 },
    grade: 'provisional',
    testedVersion: null,
    measuredDate: null,
    worksWellWith: ['open-weight deployments'],
    hue: 190,
    motif: 'field',
    details:
      'Centered vector with high update elasticity: hosting and sampling settings move this receiver around. Prompts aligned to it carry their own structure — roles, steps, format — so behavior stays stable across hosts.',
  },
];

export function getPersona(id: string): ReceiverPersona | undefined {
  return PERSONAS.find((p) => p.id === id);
}

/** Every persona vector must stay in range; used by tests and any future loader. */
export function validatePersona(p: ReceiverPersona): string[] {
  const errors: string[] = [];
  for (const [k, v] of Object.entries(p.profile)) {
    if (typeof v !== 'number' || v < 0 || v > 100) errors.push(`${p.id}: ${k} out of range (${v})`);
  }
  if (p.grade === 'measured' && (!p.testedVersion || !p.measuredDate)) {
    errors.push(`${p.id}: measured grade requires testedVersion and measuredDate`);
  }
  if (p.grade === 'provisional' && (p.testedVersion || p.measuredDate)) {
    errors.push(`${p.id}: provisional grade must not carry testedVersion/measuredDate`);
  }
  return errors;
}
