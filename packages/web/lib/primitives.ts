/**
 * Production-facing names for the five RPCS-1 receiver primitives.
 *
 * Display layer ONLY — SDK field names (ti, sg, ft, ue, ar) are unchanged
 * everywhere in code and API responses. The scientific names remain the
 * canonical identifiers in the R&D documentation (/rd).
 */

export const PRIMITIVES = [
  {
    key: 'ti',
    abbr: 'TI',
    scientific: 'Temporal Integration',
    name: 'Memory',
    gloss: 'How much history your agent holds onto',
    plain: 'Too much: stale answers in a fast-moving task. Too little: it forgets what it just learned.',
  },
  {
    key: 'ue',
    abbr: 'UE',
    scientific: 'Update Elasticity',
    name: 'Agility',
    gloss: 'How fast it changes its mind when the world changes',
    plain: 'Too high: it thrashes on noise. Too low: it keeps acting on last week’s reality.',
  },
  {
    key: 'sg',
    abbr: 'SG',
    scientific: 'Signal Gain',
    name: 'Gain',
    gloss: 'How loud incoming signals get before it reacts',
    plain: 'Too high: everything looks like an emergency. Too low: real problems slip past.',
  },
  {
    key: 'ft',
    abbr: 'FT',
    scientific: 'Firing Threshold',
    name: 'Trigger',
    gloss: 'How much pressure it takes to notice something',
    plain: 'Too tight: false alarms. Too loose: it sleeps through the fire.',
  },
  {
    key: 'ar',
    abbr: 'AR',
    scientific: 'Action Rule',
    name: 'Commit',
    gloss: 'How much evidence it needs before it acts',
    plain: 'Too eager: premature actions it has to undo. Too cautious: it stalls while the window closes.',
  },
] as const;

export type PrimitiveKey = (typeof PRIMITIVES)[number]['key'];

export const primitiveByKey = Object.fromEntries(
  PRIMITIVES.map((p) => [p.key, p]),
) as Record<PrimitiveKey, (typeof PRIMITIVES)[number]>;
