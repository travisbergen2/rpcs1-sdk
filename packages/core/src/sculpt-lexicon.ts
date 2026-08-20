/**
 * Sculpt substitution lexicon — X→Y swaps that preserve meaning while
 * raising machine comprehension, each with a receiver-framed reason.
 *
 * STATUS: every entry is UNVALIDATED-PENDING-DIVERGENCE. Per the SC-1
 * design (data rule + validation instrument), an entry earns permanence
 * only when the regenerate-divergence test shows the Y-form measurably
 * collapses interpretation spread on wild prompts. Entries here are
 * candidates authored for the tool; wild data decides survival.
 *
 * Reasons are blameless by contract: they describe how readers work,
 * never how the writer failed.
 */

export interface SculptSub {
  /** Stable id for accept/skip + flywheel logging */
  id: string;
  /** Case-insensitive pattern; word-bounded where the phrase allows it */
  pattern: string;
  /** Replacement; [bracketed holes] mark what only the sender can fill */
  y: string;
  reason: string;
}

export const SCULPT_SUBS: SculptSub[] = [
  {
    id: 'sub:asap',
    pattern: '\\basap\\b|\\bas soon as possible\\b',
    y: 'by [when?]',
    reason: '"asap" carries no deadline a reader can act on; a time does.',
  },
  {
    id: 'sub:other-day',
    pattern: '\\bthe other (night|day|week)\\b',
    y: 'on [which $1?]',
    reason: 'Relative time with no anchor — a reader (or model) cannot date-resolve it.',
  },
  {
    id: 'sub:sometime',
    pattern: '\\bsometime\\b|\\bat some point\\b',
    y: 'by [when?]',
    reason: 'Open-ended time reads as "no particular time" to most receivers.',
  },
  {
    id: 'sub:soon',
    pattern: '\\bsoonish\\b|\\bpretty soon\\b',
    y: 'by [when?]',
    reason: 'Soft deadlines decompress differently per reader; a date lands the same everywhere.',
  },
  {
    id: 'sub:wondering',
    pattern: "\\bi was wondering if (you could|you would|you can)\\b",
    y: 'please',
    reason: 'Indirect requests read as musing to literal receivers — the ask can get no reply at all.',
  },
  {
    id: 'sub:touch-base',
    pattern: '\\btouch base\\b',
    y: 'talk for [how long?] about [what?]',
    reason: 'Idiom hides the actual ask; naming the topic and length makes it answerable.',
  },
  {
    id: 'sub:handle-it',
    pattern: '\\b(handle|deal with) (it|this|that)\\b',
    y: '[name the action: do what, specifically?]',
    reason: 'The verb delegates the decision of WHAT to do — receivers pick differently.',
  },
  {
    id: 'sub:needful',
    pattern: '\\bdo the needful\\b',
    y: '[state the specific action needed]',
    reason: 'The reader must guess the entire task; naming it removes the guess.',
  },
  {
    id: 'sub:thoughts',
    pattern: '\\b(any )?thoughts\\?\\s*$',
    y: 'Which would you pick, and why?',
    reason: '"Thoughts?" licenses any reply, including none; a pointed question gets a pointed answer.',
  },
  {
    id: 'sub:whenever',
    pattern: '\\bwhenever you get a chance\\b|\\bno rush\\b',
    y: 'by [when?] (or tell me if that does not work)',
    reason: 'Politeness reads as "never required" to task-driven receivers; a date with an out keeps both.',
  },
];
